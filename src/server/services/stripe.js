import stripeFactory from 'stripe';

const STRIPE_SIGNATURE_HEADER = 'stripe-signature';

const StripeSubscriptionStatus = Object.freeze({
    Active: 'active',
    PastDue: 'past_due',
    Unpaid: 'unpaid',
    Canceled: 'canceled',
    Incomplete: 'incomplete',
    IncompleteExpired: 'incomplete_expired',
    Trialing: 'trialing'
});

const StripeEvent = Object.freeze({
    SubscriptionUpdated: 'customer.subscription.updated'
});

const stripe = stripeFactory(process.env.STRIPE_PRIVATE_KEY);

export {
    stripe as default,
    STRIPE_SIGNATURE_HEADER,
    StripeSubscriptionStatus,
    StripeEvent
};