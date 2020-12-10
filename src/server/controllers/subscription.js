import routes from '../../common/routes.js';
import { SubscriptionStatus } from '../models/subscription.js';
import stripe, { STRIPE_SIGNATURE_HEADER } from '../services/payment.js';
import moment from 'moment';

const {
    STRIPE_SUBSCRIPTION_ID: stripeSubscriptionId,
    STRIPE_HOOK_SECRET: stripeHookSecret
} = process.env;

export function stopUnsubscribed(req, res, next) {
    const { status, endsAt } = req?.user.subscription;
    const isSubscribed = status === SubscriptionStatus.Active;
    const isTrialing = status === SubscriptionStatus.Trialing && moment().toDate() < endsAt;

    if (isSubscribed || isTrialing) {
        next();
    } else {
        res.redirect(routes('subscription'));
    }
}

export async function handleStripeEvents(req, res) {
    const event = stripe.webhooks.constructEvent(
        req.body,
        req.headers[STRIPE_SIGNATURE_HEADER],
        stripeHookSecret
    );

    res.sendStatus(200);
}

export async function addPaymentMethod(req, res) {
    const stripeCustomerId = req.user.subscription.stripeCustomerId;
    const stripePaymentMethodId = req.body.stripePaymentMethodId;
    const paymentMethod = await stripe.paymentMethods.attach(stripePaymentMethodId, { customer: stripeCustomerId });
    const customer = await stripe.customers.update(
        stripeCustomerId,
        {
            invoice_settings: {
                default_payment_method: stripePaymentMethodId
            }
        }
    );
    const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: stripeSubscriptionId }],
        expand: ['latest_invoice.payment_intent']
    });

    req.user.subscription = {
        stripeId: subscription.id,
        stripeCustomerId,
        stripePaymentMethodId,
        status: subscription.status,
        endsAt: moment.unix(subscription.current_period_end).toDate(),
        lastFourDigits: paymentMethod.card.last4
    };

    req.user = await req.user.save();
    res.send(subscription);
}