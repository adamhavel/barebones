import stripeFactory from 'stripe';

const TRIAL_PERIOD_DAYS = 14;
const STRIPE_SIGNATURE_HEADER = 'stripe-signature';
const stripe = stripeFactory(process.env.STRIPE_PRIVATE_KEY);

export { stripe as default, TRIAL_PERIOD_DAYS, STRIPE_SIGNATURE_HEADER };