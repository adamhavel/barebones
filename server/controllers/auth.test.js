import crypto from 'crypto';

import routes from '../config/routes.js';
import * as ctrl from './auth.js';
import { sendRegistrationEmail, sendPasswordResetEmail } from '../services/mail.js';
import User from '../models/user.js';
import Token, { TokenPurpose } from '../models/token.js';
import { mockReq, mockRes } from './utils.js';

jest.mock('../services/mail.js');
jest.mock('../models/token.js');
jest.mock('../models/user.js');

let tokens = [];
let users = [];
const tokenStrings = [...Array(5)].map(() => crypto.randomBytes(8).toString('hex'));
const res = mockRes();

const email = 'jane.doe@example.com';
const password = '12345';

User.create.mockImplementation(({ email, password }) => {
    let user = {
        _id: users.length + 1,
        email,
        password,
        isVerified: false,
        isLocked: false,
        matchesPassword(pwd) {
            return pwd === this.password;
        },
        save: jest.fn(() => Promise.resolve(this))
    };

    users.push(user);

    return Promise.resolve(user);
});

User.findOne.mockImplementation(({ email }) => {
    return Promise.resolve(users.find(user => user.email === email));
});

User.findById.mockImplementation(id => {
    return Promise.resolve(users.find(user => user._id === id));
});

Token.create.mockImplementation(({ userId, purpose }) => {
    let token = {
        _id: tokens.length + 1,
        token: tokenStrings[tokens.length],
        userId: {
            value: userId,
            equals(id) {
                return this.value === id;
            }
        },
        purpose
    };

    tokens.push(token);

    return Promise.resolve(token);
});

Token.findOne.mockImplementation(({ token, purpose }) => {
    return Promise.resolve(tokens.find(validToken => validToken.token === token && validToken.purpose === purpose));
});

Token.deleteAll.mockImplementation((id, tokenPurpose) => {
    tokens = tokens.filter(({ userId, purpose }) => !(userId.value === id && purpose === tokenPurpose));

    return Promise.resolve();
});

beforeAll(async () => {
    let user = await User.create({ email: 'darth.vader@empire.org', password: 'powah' });
    let token = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailVerification });

    user.isVerified = true;
    user.isLocked = true;
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('register', () => {

    test('should create token, send registration email and render register form', async () => {
        await ctrl.register(mockReq({ body: { email, password } }), res);

        const user = users.find(user => user.email === email && user.password === password);
        const registrationToken = tokens.find(({ userId, purpose }) => userId.value === user._id && purpose === TokenPurpose.EmailVerification);

        expect(user).toBeDefined();
        expect(registrationToken).toBeDefined();
        expect(sendRegistrationEmail).toHaveBeenCalledWith(email, tokenStrings[1]);
        expect(res.render).toHaveBeenCalledWith('auth/register', {
            msg: `e-mail was sent to ${email}. click on the link to verify.`
        });
    });

});

describe('login', () => {

    test('should throw error if no user found', async () => {
        try {
            await ctrl.login(mockReq({
                body: {
                    email: 'john.doe@example.com',
                    password: 'admin'
                }
            }));
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe('invalid e-mail or password');
        }
    });

    test('should throw error if password does not match', async () => {
        try {
            await ctrl.login(mockReq({
                body: {
                    email,
                    password: 'admin'
                }
            }));
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe('invalid e-mail or password');
        }
    });

    test('should throw error if user not yet verified', async () => {
        try {
            await ctrl.login(mockReq({
                body: { email, password }
            }));
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe('e-mail not verified. check e-mail.');
        }
    });

    test('should throw error and send new token via email if token is invalid or expired', async () => {
        try {
            await ctrl.login(mockReq({
                body: { email, password },
                query: {
                    token: 'foo'
                }
            }));
        } catch(err) {
            const user = users.find(user => user.email === email && user.password === password);
            const registrationTokens = tokens.filter(({ userId, purpose }) => userId.value === user._id && purpose === TokenPurpose.EmailVerification);

            expect(sendRegistrationEmail).toHaveBeenCalledWith(email, tokenStrings[2]);
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe('invalid or expired token. e-mail resent.');
            expect(registrationTokens).toHaveLength(2);
        }
    });

    test('should throw error if user is locked', async () => {
        try {
            await ctrl.login(mockReq({
                body: { email: 'darth.vader@empire.org', password: 'powah' }
            }));
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe('locked account');
        }
    });

    test('should throw error if token belongs to another user', async () => {
        try {
            await ctrl.login(mockReq({
                body: { email, password },
                query: {
                    token: tokenStrings[0]
                }
            }));
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe('invalid or expired token.');
        }
    });

    test('should verify and login user, redirect to home and delete all registration tokens if token is valid', async () => {
        const user = users.find(user => user.email === email && user.password === password);
        const req = mockReq({
            body: { email, password },
            query: {
                token: tokenStrings[2]
            }
        });

        await ctrl.login(req, res);
        const registrationTokens = tokens.filter(({ userId, purpose }) => userId.value === user._id && purpose === TokenPurpose.EmailVerification);

        expect(registrationTokens).toHaveLength(0);
        expect(tokens).toHaveLength(1);
        expect(user.isVerified).toBeTruthy();
        expect(user.save).toHaveBeenCalled();
        expect(req.session.userId).toBe(user._id);
        expect(res.redirect).toHaveBeenCalledWith(routes('home'));
    });

    test('should login verified user and redirect to callback url', async () => {
        const user = users.find(user => user.email === email && user.password === password);
        const callbackUrl = '/foo';
        const req = mockReq({
            body: { email, password },
            query: { callbackUrl }
        });

        await ctrl.login(req, res);

        expect(req.session.userId).toBe(user._id);
        expect(res.redirect).toHaveBeenCalledWith(callbackUrl);
    });

});

describe('authenticate', () => {

    test('should populate request object with user if session is active', async () => {
        const user = users.find(user => user._id === 2);
        const next = jest.fn();
        const req = mockReq({
            session: {
                userId: 2
            }
        });

        await ctrl.authenticate(req, res, next);

        expect(req.user).toBe(user);
        expect(res.locals.user).toBe(user);
        expect(next).toHaveBeenCalled();
    });

    test('should clear session cookie if session is expired or invalid', async () => {
        const sessionCookieName = process.env.NODE_SESSION_COOKIE;
        const next = jest.fn();
        const req = mockReq({
            signedCookies: {
                [sessionCookieName]: {}
            }
        });

        await ctrl.authenticate(req, res, next);

        expect(req.user).toBeUndefined();
        expect(res.clearCookie).toHaveBeenCalledWith(sessionCookieName);
        expect(next).toHaveBeenCalled();
    });

    test('should logout locked user', async () => {
        const user = users.find(user => user._id === 1);
        const next = jest.fn();
        const req = mockReq({
            session: {
                userId: 1,
                destroy: jest.fn(callback => callback())
            }
        });

        await ctrl.authenticate(req, res, next);

        expect(req.user).toBeUndefined();
        expect(req.session.destroy).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith(routes('home'));
        expect(next).not.toHaveBeenCalled();
    });

});

describe('stopUnauthenticated', () => {

    test('should return 401 and render login form with callback URL if user is not authenticated', () => {
        const url = '/foo';
        const next = jest.fn();

        ctrl.stopUnauthenticated(mockReq({ url }), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.render).toHaveBeenCalledWith('auth/login', {
            query: { callbackUrl: url }
        });
        expect(next).not.toHaveBeenCalled();
    });

    test('should call next middleware if user is authenticated', () => {
        const next = jest.fn();

        ctrl.stopUnauthenticated(mockReq({ user: {} }), res, next);

        expect(res.render).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

});
