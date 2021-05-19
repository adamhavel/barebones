import stripeFactory from 'stripe';

const STRIPE_SIGNATURE_HEADER = 'stripe-signature';

const SubscriptionStatus = Object.freeze({
    Active: 'active',
    PastDue: 'past_due',
    Unpaid: 'unpaid',
    Canceled: 'canceled',
    Incomplete: 'incomplete',
    IncompleteExpired: 'incomplete_expired',
    Trialing: 'trialing'
});

const PaymentStatus = Object.freeze({
    Succeeded: 'succeeded',
    RequiresPaymentMethod: 'requires_payment_method',
    RequiresAction: 'requires_action'
});

const StripeEvent = Object.freeze({
    SubscriptionUpdated: 'customer.subscription.updated',
    SubscriptionCanceled: 'customer.subscription.deleted'
});

const stripe = stripeFactory(process.env.STRIPE_PRIVATE_KEY);

export {
    stripe as default,
    STRIPE_SIGNATURE_HEADER,
    SubscriptionStatus,
    PaymentStatus,
    StripeEvent
};