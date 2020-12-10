import db from 'mongoose';

const SubscriptionStatus = Object.freeze({
    Active: 'active',
    PastDue: 'past_due',
    Unpaid: 'unpaid',
    Canceled: 'canceled',
    Incomplete: 'incomplete',
    IncompleteExpired: 'incomplete_expired',
    Trialing: 'trialing'
});

const subscriptionSchema = new db.Schema({
    stripeId: { type: String },
    stripeCustomerId: { type: String },
    stripePaymentMethodId: { type: String },
    status: { type: String, enum: Object.values(SubscriptionStatus) },
    endsAt: { type: Date },
    lastFourDigits: { type: String }
});

export { subscriptionSchema, SubscriptionStatus };