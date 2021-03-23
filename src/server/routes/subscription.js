import express from 'express';
import bodyParser from 'body-parser';

import x from '../../common/routes.js';
import * as ctrl from '../controllers/subscription.js';
import { render, redirect } from '../controllers/utils.js';

const {
    STRIPE_PUBLIC_KEY: stripePublicKey,
    STRIPE_HOOK_PATH: stripeHookPath
} = process.env;

const subscription = express.Router();

subscription
    .route(x('/subscription'))
    .get(render('subscription/checkout', { stripePublicKey }));

subscription
    .route('/' + stripeHookPath)
    .post(
        bodyParser.raw({ type: 'application/json' }),
        ctrl.handleStripeEvents,
        (err, req, res, next) => {
            res.status(400).send(err.message);
        }
    );

subscription
    .route(x('/subscription/create-subscription'))
    .post(
        bodyParser.json(),
        ctrl.createSubscription,
        (err, req, res, next) => {
            res.status(402).send({ error: { message: err.message } });
        }
    );

subscription
    .route(x('/subscription/cancel-subscription'))
    .get(redirect(x('/settings')))
    .post(
        ctrl.cancelSubscription,
        render('settings/general')
    );

export default subscription;