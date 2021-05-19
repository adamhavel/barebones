import i18n from 'i18n';
import x from '../../common/routes.js';
import stripe, {
    STRIPE_SIGNATURE_HEADER,
    SubscriptionStatus,
    PaymentStatus,
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
    const { Incomplete, IncompleteExpired, Canceled, PastDue } = SubscriptionStatus;
    const isIncomplete = [Incomplete, IncompleteExpired, Canceled, PastDue].includes(status);
    const isSubscribed = (moment().toDate() < moment(endsAt).endOf('day')) && !isIncomplete;

    if (isSubscribed) {
        next();
    } else {
        res.flash(FlashType.Info, i18n.__('subscription.msg.trial-ended'));
        res.redirect(x('/subscription'));
    }
}

// TODO: Use billing_reason.
export async function handleStripeEvents(req, res) {
    const { type, data } = stripe.webhooks.constructEvent(
        req.body,
        req.headers[STRIPE_SIGNATURE_HEADER],
        stripeHookSecret
    );
    const payload = data.object;
    const customer = { 'subscription.customerId': payload.customer };
    let transform;

    switch (type) {

        case StripeEvent.SubscriptionUpdated: {
            transform = {
                'subscription.status': payload.status,
                'subscription.endsAt': moment.unix(payload.current_period_end).toDate(),
                'subscription.isRenewed': !payload['cancel_at_period_end']
            };
            break;
        }

        case StripeEvent.SubscriptionCanceled: {
            transform = {
                'subscription.status': payload.status
            };
            break;
        }
    }

    if (transform) {
        await User.updateOne(customer, transform);
    }

    res.sendStatus(200);
}


// TODO: Use SetupIntent.
export async function addPaymentMethod(req, res, next) {
    const { id, card } = req.body;
    const { user } = req;
    const { customerId, paymentMethodId } = user.subscription;

    if (paymentMethodId) {
        await stripe.paymentMethods.detach(paymentMethodId);
    }

    await stripe.paymentMethods.attach(id, { customer: customerId });
    await stripe.customers.update(
        customerId,
        {
            invoice_settings: {
                default_payment_method: id
            }
        }
    );

    user.subscription.paymentMethodId = id;
    user.subscription.lastFourDigits = card.last4;

    await user.save();

    next?.();
}

export async function removePaymentMethod(req, res, next) {
    const { user } = req;
    const { paymentMethodId } = user.subscription;

    await stripe.paymentMethods.detach(paymentMethodId);

    user.subscription.paymentMethodId = undefined;
    user.subscription.lastFourDigits = undefined;

    await user.save();

    next?.();
}

// TODO: Add i18n to errors.
export async function createSubscription(req, res) {
    const paymentMethod = req.body;
    const { user } = req;
    const {
        customerId,
        subscriptionId,
        status
    } = user.subscription;

    await stripe.paymentMethods.attach(
        paymentMethod.id,
        { customer: customerId }
    );

    await stripe.customers.update(
        customerId,
        {
            invoice_settings: {
                default_payment_method: paymentMethod.id
            }
        }
    );

    if (subscriptionId && status === SubscriptionStatus.Active) {
        return res.send({ error: { message: 'Členství už existuje.' } });
    } else {

    }

    const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: stripePriceId }],
        expand: ['latest_invoice.payment_intent']
    });
    const paymentIntent = subscription.latest_invoice.payment_intent;

    user.subscription = {
        customerId,
        subscriptionId: subscription.id,
        paymentMethodId: paymentMethod.id,
        paymentStatus: paymentIntent.status,
        paymentSecret: paymentIntent.client_secret,
        status: subscription.status,
        endsAt: moment.unix(subscription.current_period_end).toDate(),
        lastFourDigits: paymentMethod.card.last4,
        isRenewed: true
    };

    // if (paymentIntent.status === 'requires_action')

    await user.save();

    res.send({
        error: subscription.error,
        paymentIntent
    });
}

export async function toggleRenewal(req, res, next) {
    const { user } = req;
    const { subscriptionId, isRenewed } = user.subscription;

    if (subscriptionId) {
        user.subscription.isRenewed = !isRenewed;

        await stripe.subscriptions.update(
            subscriptionId,
            { 'cancel_at_period_end': isRenewed }
        );

        await user.save();
    }

    next?.();
}
