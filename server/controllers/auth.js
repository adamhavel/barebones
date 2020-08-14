import routes from '../config/routes.js';
import { sendRegistrationEmail } from '../services/mail.js';
import User from '../models/user.js';
import { LoginError, ApplicationError } from '../models/error.js';
import Token from '../models/token.js';

export async function renderLogin(req, res) {
    const { query } = req;

    res.render('auth/login', {
        query,
        msg: query.token && 'login to verify your e-mail'
    });
}

export async function login(req, res, next) {
    const { email, password } = req.body;
    const { token, callbackUrl } = req.query;
    const existingToken = token && await Token.findOne({ token }).exec();
    const user = await User.findOne({ email }).exec();
    const matchesPassword = await user?.matchesPassword(password);

    // Invalid e-mail or password.
    if (!matchesPassword) throw new LoginError('invalid e-mail or password');

    // User is locked.
    if (user.isLocked) throw new LoginError('locked account');

    // User not yet verified.
    if (!user.isVerified) {
        // No token provided.
        if (!token) throw new LoginError('e-mail not verified. check e-mail.');

        // Provided token invalid or expired.
        if (!existingToken || !existingToken._userId.equals(user._id)) {
            const { token } = await createToken(user._id);
            // TODO: Don't wait for confirmation.
            const emailSentConfirmation = await sendRegistrationEmail(email, token);

            throw new LoginError('invalid or expired token. e-mail resent.');
        }

        user.isVerified = true;
        await user.save();
        // Delete all tokens created during verification process.
        await Token.deleteMany({ _userId: user._id }).exec();
    }

    req.session.uuid = user.id;
    req.session.ip = req.ip;
    // TODO: Only internal URLs.
    res.redirect(callbackUrl ? decodeURI(callbackUrl) : routes('home'));
}

export async function renderLoginErrors(err, req, res, next) {
    if (err instanceof LoginError) {
        const { body, query } = req;

        return res.status(err.statusCode).render('auth/login', {
            errors: {
                email: {
                    value: body.email,
                    msg: err.message
                }
            },
            body,
            query
        });
    }

    next(err);
}

function createToken(userId) {
    return (new Token({ _userId: userId })).save();
}

export async function register(req, res) {
    const { email, password } = req.body;
    const newUser = await (new User({ email, password })).save();
    const { token } = await createToken(newUser._id);
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
            if (err) reject(err);

            req.session.uuid = req.user.id;
            req.session.ip = req.ip;
            resolve();
        });
    });
}

export async function authenticate(req, res, next) {
    const { uuid, ip } = req.session;
    const user = uuid && await User.findById(uuid).exec();

    if (user) {
        if (user.isLocked) {
            return logout(req, res);
        }

        req.user = user;
        res.locals.user = user;
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
