import routes from '../../common/routes.js';

const context = {};

export default function urlGenerator(servername) {
    return (req, res, next) => {
        req.baseUrl = req.protocol + '://' + servername;
        context.req = req;
        next();
    };
}

export function getEmailVerificationUrl(token) {
    const targetUrl = new URL(context.req.baseUrl);

    targetUrl.pathname = routes('auth/login');
    targetUrl.searchParams.set('token', token);

    return targetUrl.href;
}

export function getPasswordResetUrl(token) {
    const targetUrl = new URL(context.req.baseUrl);

    targetUrl.pathname = routes('auth/forgot');
    targetUrl.searchParams.set('token', token);

    return targetUrl.href;
}