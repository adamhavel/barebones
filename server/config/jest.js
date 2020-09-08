import i18n from 'i18n';

i18n.configure({
    directory: 'server/locales',
    defaultLocale: 'cs',
    objectNotation: true,
    updateFiles: false,
});

process.env.NODE_SESSION_COOKIE = 'stamp';

global.mockReq = function(data) {
    return Object.assign({
        query: {},
        body: {},
        session: {},
        signedCookies: {}
    }, data);
};

global.mockRes = function() {
    return {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
        redirect: jest.fn(),
        clearCookie: jest.fn(),
        locals: {}
    };
};