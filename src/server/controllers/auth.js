import i18n from 'i18n';
import moment from 'moment';

import routes from '../config/routes.js';
import { sendRegistrationEmail, sendPasswordResetEmail } from '../services/mail.js';
import stripe, { TRIAL_PERIOD_DAYS } from '../services/payment.js';
import User from '../models/user.js';
import Token, { TokenPurpose } from '../models/token.js';
import Session from '../models/session.js';
import { AuthError, ApplicationError } from '../models/error.js';

const {
    NODE_SESSION_COOKIE: sessionCookieName,
    STRIPE_SUBSCRIPTION_ID: stripeSubscriptionId
} = process.env;

export async function renderLogin(req, res) {
    const { query, body } = req;
    const { token } = query;
    const validToken = token && await Token.findOne({ token, purpose: TokenPurpose.EmailVerification });

    res.render('auth/login', {
        msg: token && (validToken ? i18n.__('auth.login.msg.token-valid-prompt') : i18n.__('auth.login.msg.token-invalid-prompt')),
        query,
        body
    });
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

        const validToken = await Token.findOne({ token, purpose: TokenPurpose.EmailVerification });

        // Provided token invalid or expired.
        if (!validToken) {
            const { token: newToken } = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailVerification });
            // TODO: Don't wait for confirmation.
            const emailSentConfirmation = await sendRegistrationEmail(email, newToken);

            throw new AuthError(i18n.__('auth.login.msg.token-invalid'));
        }

        if (!validToken.userId.equals(user._id)) {
            throw new AuthError(i18n.__('auth.login.msg.token-not-owner'));
        }

        // Start trial subscription.
        const customer = await stripe.customers.create({ email });
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: stripeSubscriptionId }],
            trial_period_days: TRIAL_PERIOD_DAYS
        });

        user.isVerified = true;
        user.subscription = {
            customer: customer.id,
            status: subscription.status,
            id: subscription.id,
            endsAt: moment.unix(subscription.current_period_end).toDate(),
            startsAt: moment.unix(subscription.current_period_start).toDate()
        };

        await user.save();
        // Delete all tokens created during verification process.
        await Token.deleteAll(user._id, TokenPurpose.EmailVerification);
    }

    populateSession(user._id, req);

    if (callbackUrl && /^\/[^/]/.test(decodeURI(callbackUrl))) {
        return res.redirect(decodeURI(callbackUrl));
    }

    res.redirect(routes('home'));
}

export async function renderForgotPassword(req, res) {
    const { query, body } = req;
    const { token } = query;
    const validToken = token && await Token.findOne({ token, purpose: TokenPurpose.PasswordReset });

    res.render('auth/forgot', {
        msg: token && (validToken ? i18n.__('auth.forgot.msg.token-valid-prompt') : i18n.__('auth.forgot.msg.token-invalid-prompt')),
        isVerified: !!validToken,
        query,
        body
    });
}

export async function resetPassword(req, res) {
    const { token } = req.query;

    if (!token) {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (user) {
            const { token: newToken } = await Token.create({ userId: user._id, purpose: TokenPurpose.PasswordReset });
            // TODO: Don't wait.
            const emailSentConfirmation = await sendPasswordResetEmail(email, newToken);
        }

        res.render('auth/forgot', {
            msg: i18n.__('auth.forgot.msg.email-sent', { email })
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
        await Session.cleanSessions(user._id);

        res.render('auth/login', {
            msg: i18n.__('auth.forgot.msg.success')
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
    // TODO: Don't wait for confirmation.
    const emailSentConfirmation = await sendRegistrationEmail(email, token);

    res.render('auth/register', {
        msg: i18n.__('auth.register.msg.email-sent', { email })
    });
}

export function logout(req, res) {
    req.session.destroy(err => {
        if (err) throw new ApplicationError(err);

        res.redirect(routes('home'));
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
            query: { callbackUrl: req.url }
        });
    } else {
        next();
    }
}

export function stopAuthenticated(req, res, next) {
    if (req.user) {
        res.redirect(routes('home'));
    } else {
        next();
    }
}
