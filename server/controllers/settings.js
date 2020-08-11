import express from 'express';

import * as validate from './validations.js';
import { stopUnauthorized } from './auth.js';
import { render, renderValidationErrors } from './utils.js';
import routes from '../config/routes.js';

const settings = express.Router();

settings.route(routes('settings'))
    .all(stopUnauthorized)
    .get(render('settings/general'))
    .post(
        validate.email(),
        validate.uniqueEmail(),
        validate.password(),
        validate.passwordMatch('oldPassword'),
        renderValidationErrors('settings/general'),
        async (req, res) => {
            const { property } = req.body;

            switch (property) {
                case 'password':
                case 'email':
                    req.user[property] = req.body[property];
                    req.user = await req.user.save();
                    break;
            }

            res.render('settings/general', { msg: '' });
        }
    );

export default settings;