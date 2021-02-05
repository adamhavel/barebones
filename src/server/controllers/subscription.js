import routes from '../../common/routes.js';
import stripe, {
    STRIPE_SIGNATURE_HEADER,
    STRIPE_SUBSCRIPTION_STATUS,
    STRIPE_EVENT
} from '../services/stripe.js';
import moment from 'moment';
import User from '../models/user.js';

const {
    STRIPE_PRICE_ID: stripePriceId,
    STRIPE_HOOK_SECRET: stripeHookSecret
} = process.env;

export function stopUnsubscribed(req, res, next) {
    const { status, endsAt } = req?.user.subscription;
    const { Active, Trialing } = STRIPE_SUBSCRIPTION_STATUS;
    const isSubscribed = status === Active;
    const isTrialing = (status === Trialing) && (moment().toDate() < endsAt);

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
    const data = event.data.object;

    switch (event.type) {
        case STRIPE_EVENT.SubscriptionUpdated: {
            await User.updateOne(
                { 'subscription.stripeCustomerId': data.customer },
                {
                    'subscription.status': data.status,
                    'subscription.endsAt': moment.unix(data.current_period_end).toDate()
                }
            );
        }
    }

    res.sendStatus(200);
}

export async function createSubscription(req, res) {
    const paymentMethod = req.body;
    const { user } = req;
    const { stripeCustomerId } = user.subscription;
    const invoiceSettings = {
        invoice_settings: {
            default_payment_method: paymentMethod.id
        }
    };

    await stripe.paymentMethods.attach(
        paymentMethod.id,
        { customer: stripeCustomerId }
    );

    await stripe.customers.update(
        stripeCustomerId,
        {
            invoice_settings: {
                default_payment_method: paymentMethod.id
            }
        }
    );

    const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: stripePriceId }],
        expand: ['latest_invoice.payment_intent']
    });

    user.subscription = {
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripePaymentMethodId: paymentMethod.id,
        status: subscription.status,
        endsAt: moment.unix(subscription.current_period_end).toDate(),
        lastFourDigits: paymentMethod.card.last4
    };

    req.user = await user.save();
    res.send(subscription);
}
