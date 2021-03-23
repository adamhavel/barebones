import db from 'mongoose';
import { SubscriptionStatus } from '../services/stripe.js';

const TRIAL_PERIOD_DAYS = 14;

const subscriptionSchema = new db.Schema({
    stripeSubscriptionId: { type: String },
    stripeCustomerId: { type: String },
    stripePaymentMethodId: { type: String },
    status: { type: String, enum: Object.values(SubscriptionStatus) },
    endsAt: { type: Date },
    lastFourDigits: { type: String },
    isRenewed: { type: Boolean }
});

export { subscriptionSchema, TRIAL_PERIOD_DAYS };