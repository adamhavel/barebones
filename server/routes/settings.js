import express from 'express';

import * as validate from '../controllers/validations.js';
import * as ctrl from '../controllers/settings.js';
import { stopUnauthenticated } from '../controllers/auth.js';
import { render } from '../controllers/utils.js';
import routes from '../config/routes.js';
import Session from '../models/session.js';

const settings = express.Router();

settings.route(routes('settings'))
    .all(
        stopUnauthenticated,
        async (req, res, next) => {
            res.locals.activeSessions = await Session.getActiveSessions(req.user._id);
            next();
        }
    )
    .get(render('settings/account'))
    .post(
        validate.email(),
        validate.uniqueEmail(),
        validate.password('newPassword'),
        validate.passwordMatch('oldPassword'),
        validate.passwordDifference(),
        validate.passwordMatch(),
        validate.renderErrors('settings/account'),
        ctrl.updateAccount
    );

export default settings;