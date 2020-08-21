import routes from '../config/routes.js';
import { sendRegistrationEmail, sendPasswordResetEmail } from '../services/mail.js';
import User from '../models/user.js';
import Token, { TokenPurpose } from '../models/token.js';
import { AuthError, ApplicationError } from '../models/error.js';

const {
    NODE_SESSION_COOKIE: sessionCookieName,
} = process.env;

export async function renderLogin(req, res) {
    res.render('auth/login', {
        msg: req.query.token && 'login to verify your e-mail'
    });
}

export async function login(req, res, next) {
    const { email, password } = req.body;
    const { token, callbackUrl } = req.query;
    const existingToken = token && await Token.findOne({ token, purpose: TokenPurpose.EmailVerification }).exec();
    const user = await User.findOne({ email }).exec();
    const matchesPassword = await user?.matchesPassword(password);

    // Invalid e-mail or password.
    if (!matchesPassword) throw new AuthError('invalid e-mail or password');

    // User is locked.
    if (user.isLocked) throw new AuthError('locked account');

    // User not yet verified.
    if (!user.isVerified) {
        // No token provided.
        if (!token) throw new AuthError('e-mail not verified. check e-mail.');

        // Provided token invalid or expired.
        if (!existingToken || !existingToken.userId.equals(user._id)) {
            const { token: newToken } = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailVerification });
            // TODO: Don't wait for confirmation.
            const emailSentConfirmation = await sendRegistrationEmail(email, newToken);

            throw new AuthError('invalid or expired token. e-mail resent.');
        }

        user.isVerified = true;
        await user.save();
        // Delete all tokens created during verification process.
        await Token.deleteAll(user._id, TokenPurpose.EmailVerification);
    }

    populateSession(user._id, req);
    // TODO: Only internal URLs.
    res.redirect(callbackUrl ? decodeURI(callbackUrl) : routes('home'));
}

export function renderAuthErrors(view) {
    return (err, req, res, next) => {
        if (err instanceof AuthError) {
            return res.status(err.statusCode).render(view, {
                errors: {
                    email: {
                        value: req.body.email,
                        msg: err.message
                    }
                }
            });
        }

        next(err);
    }
}

export async function renderForgotPassword(req, res) {
    res.render('auth/forgot', {
        msg: req.query.token && 'set new password'
    });
}

export async function resetPassword(req, res) {
    const { token } = req.query;

    if (!token) {
        const { email } = req.body;
        const user = await User.findOne({ email }).exec();

        if (user) {
            const { token: newToken } = await Token.create({ userId: user._id, purpose: TokenPurpose.PasswordReset });
            // TODO: Don't wait.
            const emailSentConfirmation = await sendPasswordResetEmail(email, newToken);
        }

        res.render('auth/forgot', {
            msg: `e-mail was sent to ${email}. click on the link to reset password.`
        });
    } else {
        const { password } = req.body;
        const existingToken = token && await Token.findOne({ token, purpose: TokenPurpose.PasswordReset }).exec();

        if (!existingToken) {
            throw new AuthError('invalid or expired token. enter e-mail to resend.');
        }

        const user = await User.findById(existingToken.userId).exec();

        user.password = password;
        await user.save();
        await Token.deleteAll(user._id, TokenPurpose.PasswordReset);

        res.render('auth/login', {
            msg: `password changed. you can login now.`
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
        msg: `e-mail was sent to ${email}. click on the link to verify.`
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
    const user = userId && await User.findById(userId).exec();
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
            query: { callbackUrl: req.url },
            msg: ''
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
