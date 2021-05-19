import express from 'express';
import bodyParser from 'body-parser';

import x from '../../common/routes.js';
import * as ctrl from '../controllers/subscription.js';
import { render, redirect } from '../controllers/utils.js';
import { SubscriptionStatus, PaymentStatus } from '../services/stripe.js';

const {
    STRIPE_PUBLIC_KEY: stripePublicKey,
    STRIPE_HOOK_PATH: stripeHookPath
} = process.env;

const subscription = express.Router();

subscription
    .route(x('/subscription'))
    .get(render('subscription/checkout', { stripePublicKey, SubscriptionStatus, PaymentStatus }));

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
    .route(x('/subscription/toggle-renewal'))
    .get(redirect(x('/subscription')))
    .post(
        ctrl.toggleRenewal,
        redirect(x('/subscription'))
    );

subscription
    .route(x('/subscription/add-payment-method'))
    .get(redirect(x('/subscription')))
    .post(
        ctrl.addPaymentMethod,
        redirect(x('/subscription'))
    );

subscription
    .route(x('/subscription/remove-payment-method'))
    .get(redirect(x('/subscription')))
    .post(
        ctrl.removePaymentMethod,
        redirect(x('/subscription'))
    );

export default subscription;