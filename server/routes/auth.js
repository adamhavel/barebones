import express from 'express';
import routes from '../config/routes.js';
import * as ctrl from '../controllers/auth.js';

const auth = express.Router();

auth.get(routes('account'), ctrl.stopAuthorized);

auth.route(routes('account.login'))
    .all(ctrl.stopAuthorized)
    .get((req, res) => {
        res.render('auth/login');
    })
    .post(ctrl.login);

auth.route(routes('account.register'))
    .all(ctrl.stopAuthorized)
    .get((req, res) => {
        res.render('auth/register');
    })
    .post(ctrl.register);

auth.get(routes('account.logout'), ctrl.logout);

export default auth;