import routes from './routes.js';

const locale = document.documentElement.getAttribute('lang');
const stripePublicKey = document.querySelector('meta[name="stripe-public-key"]')?.getAttribute('content');
const stripe = Stripe(stripePublicKey, { locale });
const card = stripe.elements().create('card', {
    base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
            color: '#aab7c4'
        }
    },
    invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
    }
});

const errorEl = document.querySelector('#stripe-errors');
const formEl = document.querySelector('#stripe-checkout');
const nameEl = document.querySelector('#stripe-billing-name');

const displayError = error => errorEl.textContent = error?.message || '';
const createReq = body => ({
    method: 'post',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(body)
});

card.mount('#stripe-card');
card.on('change', ({ error }) => displayError(error));

formEl.addEventListener('submit', async ev => {
    ev.preventDefault();

    errorEl.textContent = '';
    formEl.classList.add('is-fetching');

    try {
        const paymentMethodAttempt = await stripe.createPaymentMethod({
            type: 'card',
            card,
            billing_details: { name: nameEl.value }
        });

        if (paymentMethodAttempt.error) throw paymentMethodAttempt.error;

        const { paymentMethod } = paymentMethodAttempt;
        const subscription = await fetch(
            routes('subscription/create-subscription'),
            createReq(paymentMethod)
        ).then(res => res.json());

        if (subscription.error) throw subscription.error;

        const paymentIntent = subscription.latest_invoice.payment_intent;

        if (paymentIntent.status === 'requires_action') {
            const confirmedPaymentIntent = await stripe.confirmCardPayment(
                paymentIntent.client_secret,
                { payment_method: paymentMethod.id }
            );

            if (confirmedPaymentIntent.error) throw confirmedPaymentIntent.error;
        }

        window.location.reload();

    } catch (err) {
        displayError(err);
    }

    formEl.classList.remove('is-fetching');
});
