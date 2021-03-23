import i18n from 'i18n';
import x from '../../common/routes.js';
import stripe, {
    STRIPE_SIGNATURE_HEADER,
    SubscriptionStatus,
    StripeEvent
} from '../services/stripe.js';
import moment from 'moment';
import User from '../models/user.js';
import { FlashType } from '../models/flash.js';

const {
    STRIPE_PRICE_ID: stripePriceId,
    STRIPE_HOOK_SECRET: stripeHookSecret
} = process.env;

export function stopUnsubscribed(req, res, next) {
    const { status, endsAt } = req?.user.subscription;
    const { Incomplete, IncompleteExpired } = SubscriptionStatus;
    const isIncomplete = status === Incomplete || status === IncompleteExpired;
    const isSubscribed = (moment().toDate() < moment(endsAt).endOf('day')) && !isIncomplete;

    if (isSubscribed) {
        next();
    } else {
        res.flash(FlashType.Info, i18n.__('subscription.msg.trial-ended'));
        res.redirect(x('/subscription'));
    }
}

export async function handleStripeEvents(req, res) {
    const { type, data } = stripe.webhooks.constructEvent(
        req.body,
        req.headers[STRIPE_SIGNATURE_HEADER],
        stripeHookSecret
    );
    const payload = data.object;
    const query = { 'subscription.stripeCustomerId': payload.customer };
    let transform;

    switch (type) {

        case StripeEvent.SubscriptionUpdated: {
            transform = {
                'subscription.status': payload.status,
                'subscription.endsAt': moment.unix(payload.current_period_end).toDate()
            };
            break;
        }

        case StripeEvent.SubscriptionCanceled: {
            transform = {
                'subscription.stripeSubscriptionId': undefined,
                'subscription.status': payload.status
            };
            break;
        }
    }

    if (transform) {
        await User.updateOne(query, transform);
    }

    res.sendStatus(200);
}

// TODO: Add i18n to errors.
export async function createSubscription(req, res) {
    const paymentMethod = req.body;
    const { user } = req;
    const {
        stripeCustomerId,
        stripeSubscriptionId,
        status
    } = user.subscription;

    if (stripeSubscriptionId && status === SubscriptionStatus.Active) {
        return res.send({ error: { message: 'Členství už existuje.' } });
    }

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
        lastFourDigits: paymentMethod.card.last4,
        isRenewed: true
    };

    await user.save();

    res.send({
        error: subscription.error,
        paymentIntent: subscription.latest_invoice.payment_intent
    });
}

export async function cancelSubscription(req, res, next) {
    const { stripeSubscriptionId } = req.user.subscription;

    const subscription = await stripe.subscriptions.del(
        stripeSubscriptionId
    );

    next?.();
}
