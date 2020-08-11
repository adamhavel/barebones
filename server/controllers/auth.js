import express from 'express';

import routes from '../config/routes.js';
import * as validate from './validations.js';
import { render, renderValidationErrors } from './utils.js';
import User from '../models/user.js';

const auth = express.Router();

auth.get(routes('auth'), stopAuthorized);

auth.route(routes('auth.login'))
    .all(stopAuthorized)
    .get(render('auth/login'))
    .post(
        validate.email(),
        validate.password(),
        renderValidationErrors('auth/login'),
        async (req, res) => {
            const { email, password } = req.body;
            const user = await User.findOne({ email }).exec();
            const passwordMatches = await (user && user.matchesPassword(password));
            const failedLogin = !user || !passwordMatches;
            const userLocked = user && user.isLocked;

            if (failedLogin || userLocked) {
                return res.status(401).render('auth/login', {
                    errors: {
                        email: {
                            value: email,
                            msg: failedLogin ? 'invalid e-mail or password' : 'locked account',
                        },
                    },
                    body: req.body,
                });
            }

            req.session.uuid = user.id;
            res.redirect(routes('home'));
        }
    );

auth.route(routes('auth.register'))
    .all(stopAuthorized)
    .get(render('auth/register'))
    .post(
        validate.email(),
        validate.uniqueEmail(),
        validate.password(),
        renderValidationErrors('auth/register'),
        async (req, res) => {
            const { email, password } = req.body;
            const newUser = await (new User({ email, password })).save();

            req.session.uuid = newUser.id;
            res.redirect(routes('home'));
        }
    );

auth.route(routes('auth.logout'))
    .all(stopUnauthorized)
    .get(logout);

export function logout(req, res) {
    req.session.destroy(err => {
        res.redirect(routes('home'));
    });
}

export async function authorize(req, res, next) {
    const { uuid } = req.session;

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

export function stopUnauthorized(req, res, next) {
    if (!req.user) {
        res.status(401).render('auth/login', { callbackUrl: '' });
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

export default auth;