import stripeFactory from 'stripe';

const STRIPE_SIGNATURE_HEADER = 'stripe-signature';

const STRIPE_SUBSCRIPTION_STATUS = Object.freeze({
    Active: 'active',
    PastDue: 'past_due',
    Unpaid: 'unpaid',
    Canceled: 'canceled',
    Incomplete: 'incomplete',
    IncompleteExpired: 'incomplete_expired',
    Trialing: 'trialing'
});

const STRIPE_EVENT = Object.freeze({
    SubscriptionUpdated: 'customer.subscription.updated'
});

const stripe = stripeFactory(process.env.STRIPE_PRIVATE_KEY);

export {
    stripe as default,
    STRIPE_SIGNATURE_HEADER,
    STRIPE_SUBSCRIPTION_STATUS,
    STRIPE_EVENT
};