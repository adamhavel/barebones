import express from 'express';

import routes from '../../common/routes.js';
import * as validate from '../controllers/validations.js';
import * as ctrl from '../controllers/auth.js';
import { TokenPurpose } from '../models/token.js';
import { render, redirect, renderUserError } from '../controllers/utils.js';

const auth = express.Router();

auth.use(ctrl.stopAuthenticated);

auth
    .route(routes('auth'))
    .get(redirect(routes('/auth/login')));

auth
    .route(routes('auth/login'))
    .all(ctrl.validateToken(TokenPurpose.AccountVerification))
    .get(render('auth/login'))
    .post(
        validate.email(),
        validate.password(),
        validate.renderFormErrors('auth/login'),
        ctrl.login,
        renderUserError('auth/login')
    );

auth
    .route(routes('auth/register'))
    .get(render('auth/register'))
    .post(
        validate.email(),
        validate.uniqueEmail(),
        validate.password(),
        validate.renderFormErrors('auth/register'),
        ctrl.register
    );

auth
    .route(routes('auth/reset'))
    .get(render('auth/reset/initiate'))
    .post(
        validate.email(),
        validate.renderFormErrors('auth/reset/initiate'),
        ctrl.initiatePasswordReset,
        renderUserError('auth/reset/initiate')
    );

auth
    .route(routes('auth/reset/confirm'))
    .all(ctrl.validateToken(TokenPurpose.PasswordReset))
    .get(render('auth/reset/confirm'))
    .post(
        validate.password(),
        validate.renderFormErrors('auth/reset/confirm'),
        ctrl.resetPassword,
        renderUserError('auth/reset/confirm')
    );

auth
    .route(routes('auth/logout'))
    .all(ctrl.stopUnauthenticated)
    .get(ctrl.logout);

export default auth;