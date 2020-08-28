export function render(view) {
    return (req, res) => {
        res.render(view);
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