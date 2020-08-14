import express from 'express';

import * as validate from '../controllers/validations.js';
import * as ctrl from '../controllers/settings.js';
import { stopUnauthenticated } from '../controllers/auth.js';
import { render, renderValidationErrors } from '../controllers/utils.js';
import routes from '../config/routes.js';

const settings = express.Router();

settings.route(routes('settings'))
    .all(stopUnauthenticated)
    .get(render('settings/general'))
    .post(
        validate.email(),
        validate.uniqueEmail(),
        validate.password(),
        validate.passwordMatch('oldPassword'),
        renderValidationErrors('settings/general'),
        ctrl.updateSettings
    );

export default settings;