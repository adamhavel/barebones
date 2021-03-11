import { destroySession } from './auth.js';

export async function flash(req, res, next) {
    const redirect = res.redirect;

    res.flash = function(type, message) {
        res.locals.flash = { type, message };
        res.redirect = function(...args) {
            req.session.flash = { type, message };
            redirect.call(res, ...args);
        }

        return res;
    }

    if (req.session?.flash) {
        res.locals.flash = req.session.flash;
        delete req.session.flash;

        if (!req.session.userId && !req.session.ip) {
            await destroySession(req);
        }
    }

    next();
}
