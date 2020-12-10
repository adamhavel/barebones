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
            res.sendStatus(404);
        }
    );

subscription
    .route(routes('subscription/add-payment-method'))
    .post(
        stopUnauthenticated,
        bodyParser.json(),
        ctrl.addPaymentMethod,
        (err, req, res, next) => {
            res.status('402').send({ error: { message: err.message } });
        }
    );

export default subscription;