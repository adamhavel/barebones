import express from 'express';

import x from '../../common/routes.js';
import * as validate from '../controllers/validations.js';
import * as ctrl from '../controllers/auth.js';
import { TokenPurpose } from '../models/token.js';
import { render, redirect, renderUserError } from '../controllers/utils.js';

const auth = express.Router();

auth
    .route(x('/auth'))
    .get(redirect(x('/auth/login')));

auth
    .route(x('/auth/login'))
    .all(ctrl.validateToken(TokenPurpose.AccountVerification))
    .get(render('auth/login'))
    .post(
        validate.email(),
        validate.password(),
        validate.renderFormErrors('auth/login'),
        ctrl.login,
        redirect(x('/dashboard')),
        renderUserError('auth/login')
    );

auth
    .route(x('/auth/register'))
    .get(render('auth/register'))
    .post(
        validate.email(),
        validate.uniqueEmail(),
        validate.password(),
        validate.renderFormErrors('auth/register'),
        ctrl.register,
        render('auth/register')
    );

auth
    .route(x('/auth/reset'))
    .get(render('auth/reset/initiate'))
    .post(
        validate.email(),
        validate.renderFormErrors('auth/reset/initiate'),
        ctrl.initiatePasswordReset,
        render('auth/reset/initiate'),
        renderUserError('auth/reset/initiate')
    );

auth
    .route(x('/auth/reset/confirm'))
    .all(ctrl.validateToken(TokenPurpose.PasswordReset))
    .get(render('auth/reset/confirm'))
    .post(
        validate.password(),
        validate.renderFormErrors('auth/reset/confirm'),
        ctrl.resetPassword,
        render('auth/login'),
        renderUserError('auth/reset/confirm')
    );

auth
    .route(x('/auth/logout'))
    .all(ctrl.stopUnauthenticated)
    .get(
        ctrl.logout,
        redirect(x('/landing'))
    );

export default auth;
