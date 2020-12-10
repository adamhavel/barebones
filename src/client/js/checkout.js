import routes from './routes.js';

const stripePublicKey = document.querySelector('meta[name="stripe-public-key"]').getAttribute('content');
const stripe = Stripe(stripePublicKey, {
    locale: document.documentElement.getAttribute('lang')
});
const elements = stripe.elements();
const style = {
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
};
const cardEl = elements.create('card', { style });
const errorEl = document.querySelector('#stripe-errors');
const formEl = document.querySelector('#stripe-checkout');
const nameEl = document.querySelector('#stripe-billing-name');
const displayError = error => errorEl.textContent = error?.message || '';
const createRequest = body => ({
    method: 'post',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(body)
});

cardEl.mount('#stripe-card');
cardEl.on('change', ev => displayError(ev.error));

formEl.addEventListener('submit', async ev => {
    ev.preventDefault();
    displayError();

    try {
        const paymentMethod = await stripe.createPaymentMethod({
            type: 'card',
            card: cardEl,
            billing_details: { name: nameEl.value }
        });

        if (paymentMethod.error) throw paymentMethod.error;

        const stripePaymentMethodId = paymentMethod.paymentMethod.id;
        const req = createRequest({ stripePaymentMethodId });
        const subscription = await fetch(routes('subscription/add-payment-method'), req)
            .then(res => res.json());

        if (subscription.error) throw subscription.error;

        const paymentIntent = subscription.latest_invoice.payment_intent;

        if (paymentIntent.status === 'requires_action') {
            const confirmedPaymentIntent = await stripe.confirmCardPayment(
                paymentIntent.client_secret,
                { payment_method: stripePaymentMethodId }
            );

            if (confirmedPaymentIntent.error) throw confirmedPaymentIntent.error;
        }

        if (subscription.status === 'active') {
            console.log('yay', subscription);
            return;
        }

    } catch (err) {
        displayError(err);
    }
});
