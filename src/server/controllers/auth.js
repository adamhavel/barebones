import i18n from 'i18n';
import moment from 'moment';
import Url from 'url';

import x from '../../common/routes.js';
import { sendRegistrationEmail, sendPasswordResetEmail } from '../services/mail.js';
import stripe, { SubscriptionStatus } from '../services/stripe.js';
import User from '../models/user.js';
import Token, { TokenPurpose } from '../models/token.js';
import { TRIAL_PERIOD_DAYS } from '../models/subscription.js';
import Session from '../models/session.js';
import { AuthError, ApplicationError } from '../models/error.js';
import { FlashType } from '../models/flash.js';

const {
    NODE_SESSION_COOKIE: sessionCookieName
} = process.env;

export function validateToken(purpose) {
    return async function(req, res, next) {
        const { token } = req.query;
        let namespace;

        switch (purpose) {
            case TokenPurpose.AccountVerification: {
                namespace = 'login';
                break;
            }
            case TokenPurpose.PasswordReset: {
                namespace = 'reset';
                break;
            }
        }

        if (token) {
            const validToken = await Token.findOne({ token, purpose });

            res.flash(FlashType.Info, i18n.__(`auth.${namespace}.msg.token-${validToken ? 'valid' : 'invalid'}-prompt`));
        }

        next?.();
    }
}

export async function login(req, res, next) {
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

        const validToken = await Token.findOne({ token, purpose: TokenPurpose.AccountVerification, userId: user._id });

        // Provided token invalid or expired.
        if (!validToken) {
            const { token: newToken } = await Token.create({ userId: user._id, purpose: TokenPurpose.AccountVerification });

            sendRegistrationEmail(email, newToken);

            throw new AuthError(i18n.__('auth.login.msg.token-invalid'));
        }

        // TODO: Update tests.
        const { data: [ existingCustomer ] } = await stripe.customers.list({ email });
        const { id: customer } = existingCustomer || await stripe.customers.create({ email });

        user.isVerified = true;
        user.subscription = {
            customerId: customer,
            status: SubscriptionStatus.Trialing,
            endsAt: moment().add(TRIAL_PERIOD_DAYS, 'days').toDate()
        };

        if (existingCustomer) {
            const { data: [ existingSubscription ] } = await stripe.subscriptions.list({ customer });
            const { data: [ existingPaymentMethod ] } = await stripe.paymentMethods.list({ customer });

            if (existingSubscription) {
                user.subscription = {
                    ...user.subscription,
                    subscriptionId: existingSubscription.id,
                    status: existingSubscription.status,
                    endsAt: moment.unix(existingSubscription.current_period_end).toDate(),
                    isRenewd: existingSubscription.cancel_at_period_end
                }
            };

            user.subscription.paymentMethodId = existingPaymentMethod.id;
        }

        await user.save();
        // Delete all tokens created during verification process.
        await Token.deleteAll(user._id, TokenPurpose.AccountVerification);

        // TODO: Add i18n.
        res.flash(FlashType.Info, i18n.__('auth.login.msg.account-verified'));
    }

    // Reopen account.
    if (user.deletedAt) {
        user.deletedAt = undefined;

        await user.save();

        res.flash(FlashType.Info, i18n.__('auth.login.msg.account-reopened'));
    }

    populateSession(user._id, req);

    if (callbackUrl && /^\/[^/]/.test(decodeURI(callbackUrl))) {
        return res.redirect(decodeURI(callbackUrl));
    }

    next?.();
}

export async function initiatePasswordReset(req, res, next) {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
        const { token: newToken } = await Token.create({ userId: user._id, purpose: TokenPurpose.PasswordReset });

        sendPasswordResetEmail(email, newToken);
    }

    // Show success message even if no user found, to prevent account fishing.
    res.flash(FlashType.Info, i18n.__('auth.reset.msg.email-sent', { email }));

    next?.();
}

export async function resetPassword(req, res, next) {
    const { token } = req.query;
    const { password } = req.body;
    const validToken = await Token.findOne({ token, purpose: TokenPurpose.PasswordReset });

    if (!validToken) {
        // TODO: Add link to initiate.
        throw new AuthError(i18n.__('auth.reset.msg.token-invalid-prompt'));
    }

    // TODO: Check if user exists.
    const user = await User.findById(validToken.userId);

    user.password = password;

    await user.save();
    await Token.deleteAll(user._id, TokenPurpose.PasswordReset);
    await Session.revokeSessions(user._id);

    res.flash(FlashType.Info, i18n.__('auth.reset.msg.success'));

    next?.();
}

export async function register(req, res, next) {
    const { email, password } = req.body;
    const newUser = await User.create({ email, password });
    const { token } = await Token.create({ userId: newUser._id, purpose: TokenPurpose.AccountVerification });

    sendRegistrationEmail(email, token);

    res.flash(FlashType.Info, i18n.__('auth.register.msg.email-sent', { email }));

    next?.();
}

export async function logout(req, res, next) {
    await destroySession(req);

    next?.();
}

export function populateSession(userId, req) {
    req.session.userId = userId;
    req.session.ip = req.ip;
}

export function depopulateSession(req) {
    delete req.session.userId;
    delete req.session.ip;
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

export function destroySession(req) {
    return new Promise((resolve, reject) => {
        req.session.destroy(err => {
            if (err) reject(new ApplicationError(err));

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
            return logout(req, res, next);
        }

        req.user = user;
        res.locals.user = user;
    } else if (hasSessionCookie) {
        res.clearCookie(sessionCookieName);
    }

    next?.();
}

export function stopUnauthenticated(req, res, next) {
    if (!req.user) {
        res
            .flash(FlashType.Info, i18n.__('auth.login.msg.login-prompt'))
            .status(401)
            .render('auth/login', {
                querystring: Url.format({
                    query: {
                        ...req.query,
                        callbackUrl: req.originalUrl
                    }
                })
            });
    } else {
        next?.();
    }
}

export function stopAuthenticated(req, res, next) {
    if (req.user && req.originalUrl !== x('/auth/logout')) {
        res.redirect(x('/dashboard'));
    } else {
        next?.();
    }
}
