import express from 'express';

import * as validate from '../controllers/validations.js';
import * as ctrl from '../controllers/settings.js';
import { stopUnauthenticated } from '../controllers/auth.js';
import { render, redirect, renderUserError } from '../controllers/utils.js';
import routes from '../../common/routes.js';

const settings = express.Router();

settings.use(stopUnauthenticated);

settings
    .route(routes('settings'))
    .get(
        ctrl.validateEmailUpdate,
        render('settings/general'),
        renderUserError('settings/general')
    );

settings
    .route(routes('settings/delete-account'))
    .get(redirect(routes('/settings')))
    .post(
        validate.passwordMatch('delete-account__password'),
        validate.renderFormErrors('settings/general'),
        ctrl.deleteAccount
    );

settings
    .route(routes('settings/update-password'))
    .get(redirect(routes('/settings')))
    .post(
        validate.password('newPassword'),
        validate.passwordMatch('update-password__password'),
        validate.renderFormErrors('settings/general'),
        ctrl.updatePassword
    );

settings
    .route(routes('settings/update-email'))
    .get(redirect(routes('/settings')))
    .post(
        validate.email(),
        validate.uniqueEmail(),
        validate.passwordMatch('update-email__password'),
        validate.renderFormErrors('settings/general'),
        ctrl.updateEmail
    );

export default settings;
