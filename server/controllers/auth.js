import routes from '../config/routes.js';
import { sendRegistrationEmail } from '../services/mail.js';
import User from '../models/user.js';
import Token from '../models/token.js';

export async function renderLogin(req, res) {
    const { query } = req;
    const { token } = query;
    const existingToken = token && await Token.findOne({ token });
    const msg = existingToken ? 'login to verify your e-mail' : 'invalid or expired token';

    res.render('auth/login', token && { query, msg });
}

export async function login(req, res, next) {
    const { email, password } = req.body;
    const { token, callbackUrl } = req.query;
    const dbQuery = { email };

    if (token) {
        const existingToken = await Token.findOne({ token });

        if (!existingToken) {
            // TODO: Change to error throws.
            req.msg = 'invalid or expired token';
            return next();
        }

        dbQuery._id = existingToken.userId;
    }

    const user = await User.findOne(dbQuery).exec();

    // TODO: Change to error throws.
    if (!(user && await user.matchesPassword(password))) {
        console.log('yay');
        req.msg = 'invalid e-mail or password';
    } else if (user.isLocked) {
        req.msg = 'locked account';
    } else if (!token && !user.isVerified) {
        req.msg = 'e-mail not verified';
    }

    // TODO: Change to error throws.
    if (req.msg) return next();

    if (token) {
        user.isVerified = true;
        await user.save();
        await Token.findOneAndDelete({ token }).exec();
    }

    req.session.uuid = user.id;
    req.session.ip = req.ip;
    // TODO: Only internal URLs.
    res.redirect(callbackUrl ? decodeURI(callbackUrl) : routes('home'));
}

export async function renderLoginErrors(req, res) {
    const { body, msg, query } = req;

    res.status(401).render('auth/login', {
        errors: {
            email: { value: body.email, msg }
        },
        body,
        query
    });
}

export async function register(req, res) {
    const { email, password } = req.body;
    const newUser = await (new User({ email, password })).save();
    const { token } = await (new Token({ userId: newUser.id })).save();
    const verificationUrl = req.baseUrl;

    verificationUrl.pathname = routes('auth/login');
    verificationUrl.search = '?token=' + token;

    const emailSentConfirmation = await sendRegistrationEmail(email, verificationUrl.toString());

    res.render('auth/register', {
        msg: `e-mail was sent to ${email}. click on the link to verify.`
    });
}

export function logout(req, res) {
    req.session.destroy(err => {
        res.redirect(routes('home'));
    });
}

export async function authenticate(req, res, next) {
    const { uuid, ip } = req.session;

    if (uuid) {
        req.user = await User.findById(uuid).exec();

        if (req.user.isLocked) {
            logout(req, res);
        } else {
            res.locals.user = req.user;
        }
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
