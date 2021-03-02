import x from '../../common/routes.js';

// TODO: https
const baseUrl = 'http://' + process.env.APP_HOST;

export function getAccountVerificationUrl(token) {
    const targetUrl = new URL(baseUrl);

    targetUrl.pathname = x('/auth/login');
    targetUrl.searchParams.set('token', token);

    return targetUrl.href;
}

export function getPasswordResetUrl(token) {
    const targetUrl = new URL(baseUrl);

    targetUrl.pathname = x('/auth/reset/confirm');
    targetUrl.searchParams.set('token', token);

    return targetUrl.href;
}

export function getEmailAddressUpdateUrl(token) {
    const targetUrl = new URL(baseUrl);

    targetUrl.pathname = x('/settings');
    targetUrl.searchParams.set('token', token);

    return targetUrl.href;
}