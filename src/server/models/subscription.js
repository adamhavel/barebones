import db from 'mongoose';
import { StripeSubscriptionStatus } from '../services/stripe.js';

const TRIAL_PERIOD_DAYS = 14;

const subscriptionSchema = new db.Schema({
    stripeSubscriptionId: { type: String },
    stripeCustomerId: { type: String },
    stripePaymentMethodId: { type: String },
    status: { type: String, enum: Object.values(StripeSubscriptionStatus) },
    endsAt: { type: Date },
    lastFourDigits: { type: String }
});

export { subscriptionSchema, TRIAL_PERIOD_DAYS };