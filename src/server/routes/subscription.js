import express from 'express';
import bodyParser from 'body-parser';

import routes from '../../common/routes.js';
import * as ctrl from '../controllers/subscription.js';
import { render } from '../controllers/utils.js';
import { stopUnauthenticated } from '../controllers/auth.js';

const {
    STRIPE_PUBLIC_KEY: stripePublicKey,
    STRIPE_HOOK_PATH: stripeHookPath
} = process.env;

const subscription = express.Router();

subscription
    .route(routes('subscription'))
    .all(stopUnauthenticated)
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
    .route(routes('subscription/create-subscription'))
    .post(
        stopUnauthenticated,
        bodyParser.json(),
        ctrl.createSubscription,
        (err, req, res, next) => {
            res.status(402).send({ error: { message: err.message } });
        }
    );

export default subscription;