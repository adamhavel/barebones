import i18n from 'i18n';

export function render(view) {
    return (req, res) => {
        const { query, body } = req;

        res.render(view, { query, body });
    };
};

export function redirect(route) {
    return (req, res) => {
        res.redirect(route);
    };
};

export function mockReq(data) {
    return Object.assign({
        query: {},
        body: {},
        session: {},
        signedCookies: {}
    }, data);
};

export function mockRes() {
    return {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
        redirect: jest.fn(),
        clearCookie: jest.fn(),
        locals: {}
    };
};