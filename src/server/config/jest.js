import i18n from 'i18n';
import db from 'mongoose';
import crypto from 'crypto';

import stripe, { StripeSubscriptionStatus } from '../services/stripe.js';
import User from '../models/user.js';
import Session from '../models/session.js';
import Token, { TokenPurpose } from '../models/token.js';

i18n.configure({
    directory: 'src/server/locales',
    defaultLocale: 'cs',
    objectNotation: true,
    updateFiles: false,
});

process.env.NODE_SESSION_COOKIE = 'stamp';

jest.mock('../services/mail.js');
jest.mock('../services/stripe.js');
jest.mock('../models/token.js');
jest.mock('../models/user.js');
jest.mock('../models/session.js');

User.create.mockImplementation(({ email, password }) => {
    const user = {
        _id: ObjectId(),
        email,
        password,
        isVerified: false,
        isLocked: false,
        matchesPassword(pwd) {
            return pwd === this.password;
        },
        save: jest.fn(() => Promise.resolve(this))
    };

    mockUsers.push(user);

    return Promise.resolve(user);
});

User.findOne.mockImplementation(({ email }) => {
    return Promise.resolve(mockUsers.find(user => user.email === email));
});

User.findById.mockImplementation(id => {
    return Promise.resolve(mockUsers.find(user => user._id === id));
});

Token.create.mockImplementation(({ userId, purpose }) => {
    const token = {
        _id: ObjectId(),
        token: tokenStrings[mockTokens.length],
        userId,
        purpose
    };

    mockTokens.push(token);

    return Promise.resolve(token);
});

Token.findOne.mockImplementation(({ token, purpose, userId }) => {
    return Promise.resolve(mockTokens.find(validToken =>
        validToken.token === token
        && validToken.purpose === purpose
        && (userId === undefined || validToken.userId === userId)
    ));
});

Token.deleteAll.mockImplementation((id, tokenPurpose) => {
    mockTokens = mockTokens.filter(({ userId, purpose }) => !(userId === id && purpose === tokenPurpose));

    return Promise.resolve();
});

stripe.customers.list = jest.fn(({ email }) => Promise.resolve({
    data: []
}));

stripe.customers.create = jest.fn(({ email }) => Promise.resolve({
    email,
    id: randomHex()
}));

global.mockReq = function(data) {
    return Object.assign({
        query: {},
        body: {},
        session: {},
        signedCookies: {}
    }, data);
};

global.res = {
    status: jest.fn().mockReturnThis(),
    render: jest.fn(),
    redirect: jest.fn(),
    clearCookie: jest.fn(),
    locals: {}
};

global.randomHex = () => crypto.randomBytes(8).toString('hex');
global.ObjectId = db.Types.ObjectId;
global.tokenStrings = [...Array(5)].map(randomHex);
global.email = 'jane.doe@example.com';
global.password = '12345';
global.mockUsers = [];
global.mockTokens = [];
global.clearMocks = function() {
    jest.clearAllMocks();
    mockUsers.length = 0;
    mockTokens.length = 0;
}
