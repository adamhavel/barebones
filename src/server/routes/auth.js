import express from 'express';

import routes from '../../common/routes.js';
import * as validate from '../controllers/validations.js';
import * as ctrl from '../controllers/auth.js';
import { TokenPurpose } from '../models/token.js';
import { render, redirect, renderUserError } from '../controllers/utils.js';

const auth = express.Router();

auth
    .route(routes('auth'))
    .get(redirect(routes('auth/login')));

auth
    .route(routes('auth/login'))
    .all(
        ctrl.stopAuthenticated,
        ctrl.validateToken(TokenPurpose.EmailVerification)
    )
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
    .all(ctrl.stopAuthenticated)
    .get(render('auth/register'))
    .post(
        validate.email(),
        validate.uniqueEmail(),
        validate.password(),
        validate.renderFormErrors('auth/register'),
        ctrl.register
    );

auth
    .route(routes('auth/forgot'))
    .all(
        ctrl.stopAuthenticated,
        ctrl.validateToken(TokenPurpose.PasswordReset)
    )
    .get(render('auth/forgot'))
    .post(
        validate.email(),
        validate.password(),
        validate.renderFormErrors('auth/login'),
        ctrl.resetPassword,
        renderUserError('auth/login')
    );

auth
    .route(routes('auth/logout'))
    .all(ctrl.stopUnauthenticated)
    .get(ctrl.logout);

export default auth;