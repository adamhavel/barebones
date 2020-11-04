import stripeFactory from 'stripe';

const TRIAL_PERIOD_DAYS = 14;
const stripe = stripeFactory(process.env.STRIPE_PRIVATE_KEY);

export { stripe as default, TRIAL_PERIOD_DAYS };