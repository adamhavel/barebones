import i18n from 'i18n';
import moment from 'moment';
import Url from 'url';

import routes from '../../common/routes.js';
import { sendRegistrationEmail, sendPasswordResetEmail } from '../services/mail.js';
import stripe, { StripeSubscriptionStatus } from '../services/stripe.js';
import User from '../models/user.js';
import Token, { TokenPurpose } from '../models/token.js';
import { TRIAL_PERIOD_DAYS } from '../models/subscription.js';
import Session from '../models/session.js';
import { AuthError, ApplicationError } from '../models/error.js';

const {
    NODE_SESSION_COOKIE: sessionCookieName
} = process.env;

export function validateToken(purpose) {
    return async function(req, res, next) {
        const { token } = req.query;
        let namespace;

        switch (purpose) {
            // TODO: Add email change
            case TokenPurpose.EmailVerification: {
                namespace = 'login';
                break;
            }
            case TokenPurpose.PasswordReset: {
                namespace = 'forgot';
                break;
            }
        }

        if (token) {
            const validToken = await Token.findOne({ token, purpose });

            res.locals.isTokenValid = !!validToken;
            res.locals.msg = {
                text: i18n.__(`auth.${namespace}.msg.token-${validToken ? 'valid' : 'invalid'}-prompt`),
                type: 'info'
            };
        }

        next();
    }
}

export async function login(req, res) {
    const { email, password } = req.body;
    const { token, callbackUrl } = req.query;
    const user = await User.findOne({ email });
    const matchesPassword = await user?.matchesPassword(password);

    // Invalid e-mail or password.
    if (!matchesPassword) throw new AuthError(i18n.__('auth.login.msg.credentials-invalid'));

    // User is locked.
    if (user.isLocked) throw new AuthError(i18n.__('auth.login.msg.account-locked'));

    // User not yet verified.
    if (!user.isVerified) {
        // No token provided.
        if (!token) throw new AuthError(i18n.__('auth.login.msg.account-not-verified'));
        // TODO: Add option to resent email?

        const validToken = await Token.findOne({ token, purpose: TokenPurpose.EmailVerification, userId: user._id });

        // Provided token invalid or expired.
        if (!validToken) {
            const { token: newToken } = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailVerification });

            sendRegistrationEmail(email, newToken);

            throw new AuthError(i18n.__('auth.login.msg.token-invalid'));
        }

        // TODO: Update tests.
        const { data: [ existingCustomer ] } = await stripe.customers.list({ email });
        const customer = existingCustomer || await stripe.customers.create({ email });

        user.isVerified = true;
        user.subscription = {
            stripeCustomerId: customer.id,
            status: StripeSubscriptionStatus.Trialing,
            endsAt: moment().add(TRIAL_PERIOD_DAYS, 'days').toDate()
        };

        await user.save();
        // Delete all tokens created during verification process.
        await Token.deleteAll(user._id, TokenPurpose.EmailVerification);
    }

    // Reopen account.
    if (user.deletedAt) {
        user.deletedAt = undefined;
        await user.save();
    }

    populateSession(user._id, req);

    if (callbackUrl && /^\/[^/]/.test(decodeURI(callbackUrl))) {
        return res.redirect(decodeURI(callbackUrl));
    }

    res.redirect(routes('dashboard'));
}

// TODO: Split
export async function resetPassword(req, res) {
    const { token } = req.query;

    if (!token) {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (user) {
            const { token: newToken } = await Token.create({ userId: user._id, purpose: TokenPurpose.PasswordReset });

            sendPasswordResetEmail(email, newToken);
        }

        // Show success message even if no user found, to prevent account fishing.
        res.render('auth/forgot', {
            msg: {
                text: i18n.__('auth.forgot.msg.email-sent', { email }),
                type: 'info'
            }
        });
    } else {
        const { password } = req.body;
        const validToken = await Token.findOne({ token, purpose: TokenPurpose.PasswordReset });

        if (!validToken) {
            throw new AuthError(i18n.__('auth.forgot.msg.token-invalid-prompt'));
        }

        // TODO: Check if user exists.
        const user = await User.findById(validToken.userId);

        user.password = password;

        await user.save();
        await Token.deleteAll(user._id, TokenPurpose.PasswordReset);
        await Session.revokeSessions(user._id);

        res.render('auth/login', {
            msg: {
                text: i18n.__('auth.forgot.msg.success'),
                type: 'info'
            }
        });
    }
}

function populateSession(userId, req) {
    req.session.userId = userId;
    req.session.ip = req.ip;
}

export async function register(req, res) {
    const { email, password } = req.body;
    const newUser = await User.create({ email, password });
    const { token } = await Token.create({ userId: newUser._id, purpose: TokenPurpose.EmailVerification });

    sendRegistrationEmail(email, token);

    res.render('auth/register', {
        msg: {
            text: i18n.__('auth.register.msg.email-sent', { email }),
            type: 'info'
        }
    });
}

export function logout(req, res) {
    req.session.destroy(err => {
        if (err) throw new ApplicationError(err);

        res.redirect(routes('landing'));
    });
}

export function regenerateSession(req) {
    return new Promise((resolve, reject) => {
        req.session.regenerate(err => {
            if (err) reject(new ApplicationError(err));

            populateSession(req.user._id, req);
            resolve();
        });
    });
}

export async function authenticate(req, res, next) {
    const { userId, ip } = req.session;
    const user = userId && await User.findById(userId);
    const hasSessionCookie = req.signedCookies[sessionCookieName];

    if (user) {
        if (user.isLocked) {
            return logout(req, res);
        }

        req.user = user;
        res.locals.user = user;
    } else if (hasSessionCookie) {
        res.clearCookie(sessionCookieName);
    }

    next();
}

export function stopUnauthenticated(req, res, next) {
    if (!req.user) {
        res.status(401).render('auth/login', {
            querystring: Url.format({
                query: {
                    ...req.query,
                    callbackUrl: req.url
                }
            })
        });
    } else {
        next();
    }
}

export function stopAuthenticated(req, res, next) {
    if (req.user) {
        res.redirect(routes('dashboard'));
    } else {
        next();
    }
}
