import routes from '../../common/routes.js';

// TODO: https
const baseUrl = 'http://' + process.env.APP_HOST;

export function getEmailVerificationUrl(token) {
    const targetUrl = new URL(baseUrl);

    targetUrl.pathname = routes('auth/login');
    targetUrl.searchParams.set('token', token);

    return targetUrl.href;
}

export function getPasswordResetUrl(token) {
    const targetUrl = new URL(baseUrl);

    targetUrl.pathname = routes('auth/forgot');
    targetUrl.searchParams.set('token', token);

    return targetUrl.href;
}