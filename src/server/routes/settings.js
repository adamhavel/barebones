import express from 'express';

import * as validate from '../controllers/validations.js';
import * as ctrl from '../controllers/settings.js';
import { stopUnauthenticated } from '../controllers/auth.js';
import { render, redirect } from '../controllers/utils.js';
import routes from '../../common/routes.js';
import Session from '../models/session.js';

const settings = express.Router();

settings
    .route(routes('settings'))
    .all(stopUnauthenticated)
    .get(render('settings/general'));
//     .post(
//         validate.email(),
//         validate.uniqueEmail(),
//         validate.password('newPassword'),
//         validate.passwordMatch('oldPassword'),
//         validate.passwordMatch(),
//         validate.renderFormErrors('settings/general'),
//         ctrl.updateAccount
//     );

settings
    .route(routes('settings/delete-account'))
    .all(stopUnauthenticated)
    .get(redirect(routes('settings')))
    .post(
        validate.passwordMatch(),
        validate.renderFormErrors('settings/general'),
        ctrl.deleteAccount
    );

settings
    .route(routes('settings/update-password'))
    .all(stopUnauthenticated)
    .get(redirect(routes('settings')))
    .post(
        validate.password('newPassword'),
        validate.passwordMatch('oldPassword'),
        validate.renderFormErrors('settings/general'),
        ctrl.updatePassword
    );


export default settings;