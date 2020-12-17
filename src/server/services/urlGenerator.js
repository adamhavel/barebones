import routes from '../../common/routes.js';

const { SERVERNAME: servername } = process.env;
const baseUrl = 'http://' + servername;

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