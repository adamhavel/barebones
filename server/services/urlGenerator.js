import routes from '../config/routes.js';

const context = {};

export default function urlGenerator(req, res, next) {
    const { protocol, hostname } = req;

    context.baseUrl = protocol + '://' + hostname;
    next();
}

export function getVerificationUrl(token) {
    const verificationUrl = new URL(context.baseUrl);

    verificationUrl.pathname = routes('auth/login');
    verificationUrl.searchParams.set('token', token);

    return verificationUrl.href;
}