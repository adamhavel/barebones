import routes from '../config/routes.js';
import { sendRegistrationEmail, sendPasswordResetEmail } from '../services/mail.js';
import User from '../models/user.js';
import Token, { TokenPurpose } from '../models/token.js';
import { AuthError, ApplicationError } from '../models/error.js';

const {
    NODE_SESSION_COOKIE: sessionCookieName,
} = process.env;

export async function renderLogin(req, res) {
    const { query, body } = req;
    const { token } = query;
    const validToken = token && await Token.findOne({ token, purpose: TokenPurpose.EmailVerification });

    res.render('auth/login', {
        msg: token && (validToken ? 'login to verify your e-mail' : 'invalid or expired token. enter e-mail and password to resend.'),
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
    if (!matchesPassword) throw new AuthError('invalid e-mail or password');

    // User is locked.
    if (user.isLocked) throw new AuthError('locked account');

    // User not yet verified.
    if (!user.isVerified) {
        // No token provided.
        if (!token) throw new AuthError('e-mail not verified. check e-mail.');

        const validToken = await Token.findOne({ token, purpose: TokenPurpose.EmailVerification });

        // Provided token invalid or expired.
        if (!validToken) {
            const { token: newToken } = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailVerification });
            // TODO: Don't wait for confirmation.
            const emailSentConfirmation = await sendRegistrationEmail(email, newToken);

            throw new AuthError('invalid or expired token. e-mail resent.');
        }

        if (!validToken.userId.equals(user._id)) {
            throw new AuthError('invalid or expired token.');
        }

        user.isVerified = true;
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

export function renderAuthErrors(view) {
    return (err, req, res, next) => {
        if (err instanceof AuthError) {
            const { query, body } = req;

            return res.status(err.statusCode).render(view, {
                msg: err.message,
                query,
                body
            });
        }

        next(err);
    }
}

export async function renderForgotPassword(req, res) {
    const { query, body } = req;
    const { token } = query;
    const validToken = token && await Token.findOne({ token, purpose: TokenPurpose.PasswordReset });

    res.render('auth/forgot', {
        msg: token && (validToken ? 'set new password' : 'invalid or expired token. enter e-mail to resend.'),
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
            msg: `e-mail was sent to ${email}. click on the link to reset password.`
        });
    } else {
        const { password } = req.body;
        const validToken = await Token.findOne({ token, purpose: TokenPurpose.PasswordReset });

        if (!validToken) {
            throw new AuthError('invalid or expired token. enter e-mail to resend.');
        }

        const user = await User.findById(validToken.userId);

        user.password = password;

        await user.save();
        await Token.deleteAll(user._id, TokenPurpose.PasswordReset);

        res.render('auth/login', {
            msg: `password changed. login using the new password.`
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
