import express from 'express';

import routes from '../config/routes.js';
import * as validate from '../controllers/validations.js';
import * as ctrl from '../controllers/auth.js';
import { render, redirect } from '../controllers/utils.js';

const auth = express.Router();

auth.get(routes('auth'), redirect(routes('auth/login')));

auth.route(routes('auth/login'))
    .all(ctrl.stopAuthenticated)
    .get(ctrl.renderLogin)
    .post(
        validate.email(),
        validate.password(),
        validate.renderErrors('auth/login'),
        ctrl.login,
        ctrl.renderAuthErrors('auth/login')
    );

auth.route(routes('auth/register'))
    .all(ctrl.stopAuthenticated)
    .get(render('auth/register'))
    .post(
        validate.email(),
        validate.uniqueEmail(),
        validate.password(),
        validate.renderErrors('auth/register'),
        ctrl.register
    );

auth.route(routes('auth/forgot'))
    .all(ctrl.stopAuthenticated)
    .get(ctrl.renderForgotPassword)
    .post(
        validate.email(),
        validate.password(),
        validate.renderErrors('auth/forgot'),
        ctrl.resetPassword,
        ctrl.renderAuthErrors('auth/forgot')
    );

auth.route(routes('auth/logout'))
    .all(ctrl.stopUnauthenticated)
    .get(ctrl.logout);

export default auth;