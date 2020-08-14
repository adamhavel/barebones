import express from 'express';

import * as validate from '../controllers/validations.js';
import * as ctrl from '../controllers/settings.js';
import { stopUnauthenticated } from '../controllers/auth.js';
import { render, renderValidationErrors } from '../controllers/utils.js';
import routes from '../config/routes.js';

const settings = express.Router();

settings.route(routes('settings'))
    .all(stopUnauthenticated)
    .get(render('settings/account'))
    .post(
        validate.email(),
        validate.uniqueEmail(),
        validate.password('newPassword'),
        validate.passwordMatch('oldPassword'),
        validate.passwordMatch('password'),
        validate.dateChallenge(),
        renderValidationErrors('settings/account'),
        ctrl.updateAccount
    );

export default settings;