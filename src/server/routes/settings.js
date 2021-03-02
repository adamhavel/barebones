import express from 'express';

import * as validate from '../controllers/validations.js';
import * as ctrl from '../controllers/settings.js';
import { render, redirect, renderUserError } from '../controllers/utils.js';
import x from '../../common/routes.js';

const settings = express.Router();

settings
    .route(x('/settings'))
    .get(
        ctrl.validateEmailUpdate,
        render('settings/general')
    );

settings
    .route(x('/settings/delete-account'))
    .get(redirect(x('/settings')))
    .post(
        validate.passwordMatch('delete-account__password'),
        validate.renderFormErrors('settings/general'),
        ctrl.deleteAccount
    );

settings
    .route(x('/settings/update-password'))
    .get(redirect(x('/settings')))
    .post(
        validate.password('newPassword'),
        validate.passwordMatch('update-password__password'),
        validate.renderFormErrors('settings/general'),
        ctrl.updatePassword
    );

settings
    .route(x('/settings/update-email'))
    .get(redirect(x('/settings')))
    .post(
        validate.email(),
        validate.uniqueEmail(),
        validate.passwordMatch('update-email__password'),
        validate.renderFormErrors('settings/general'),
        ctrl.updateEmail
    );

export default settings;
