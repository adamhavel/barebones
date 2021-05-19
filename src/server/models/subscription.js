import db from 'mongoose';
import { SubscriptionStatus, PaymentStatus } from '../services/stripe.js';

const TRIAL_PERIOD_DAYS = 14;

const subscriptionSchema = new db.Schema({
    subscriptionId: { type: String },
    customerId: { type: String },
    paymentMethodId: { type: String },
    paymentStatus: { type: String, enum: Object.values(PaymentStatus) },
    paymentSecret: { type: String },
    status: { type: String, enum: Object.values(SubscriptionStatus) },
    endsAt: { type: Date },
    lastFourDigits: { type: String },
    isRenewed: { type: Boolean }
});

export { subscriptionSchema, TRIAL_PERIOD_DAYS };