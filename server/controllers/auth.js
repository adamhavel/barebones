import User from '../models/user.js';
import routes from '../config/routes.js';
import { templateEnv } from '../app.js';

export function login(req, res) {
    let { email, password } = req.body;

    req.user = User.find(user => user.email === email && user.password === password);

    if (req.user) {
        req.session.uuid = req.user.id;
        res.redirect(routes('home'));
    } else {
        res.redirect(routes('account.login'));
    }
}

export function register(req, res) {

}

export function logout(req, res) {
    req.session.destroy(err => {
        templateEnv.addGlobal('user', undefined);
        res.redirect(routes('home'));
    });
}

export function authorize(req, res, next) {
    let { uuid } = req.session;

    if (uuid) {
        req.user = User.find(user => user.id === uuid);
        templateEnv.addGlobal('user', req.user);
    }

    next();
}

export function stopUnauthorized(req, res, next) {
    if (!req.user) {
        res.redirect(routes('account.login'));
    } else {
        next();
    }
}

export function stopAuthorized(req, res, next) {
    if (req.user) {
        res.redirect(routes('home'));
    } else {
        next();
    }
}