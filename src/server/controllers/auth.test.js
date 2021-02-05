import crypto from 'crypto';
import i18n from 'i18n';
import db from 'mongoose';
import moment from 'moment';

import routes from '../../common/routes.js';
import * as ctrl from './auth.js';
import { sendRegistrationEmail, sendPasswordResetEmail } from '../services/mail.js';
import User from '../models/user.js';
import { TRIAL_PERIOD_DAYS } from '../models/subscription.js';
import stripe, { STRIPE_SUBSCRIPTION_STATUS } from '../services/stripe.js';
import Session from '../models/session.js';
import Token, { TokenPurpose } from '../models/token.js';

jest.mock('../services/mail.js');
jest.mock('../models/token.js');
jest.mock('../models/user.js');
jest.mock('../models/session.js');

let mockTokens, mockUsers;
const tokenStrings = [...Array(5)].map(() => crypto.randomBytes(8).toString('hex'));
const { ObjectId } = db.Types;
const res = mockRes();
const email = 'jane.doe@example.com';
const password = '12345';

stripe.customers.list = jest.fn(({ email }) => Promise.resolve({
    data: []
}));

stripe.customers.create = jest.fn(({ email }) => Promise.resolve({
    email,
    id: crypto.randomBytes(8).toString('hex')
}));

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

Token.findOne.mockImplementation(({ token, purpose }) => {
    return Promise.resolve(mockTokens.find(validToken => validToken.token === token && validToken.purpose === purpose));
});

Token.deleteAll.mockImplementation((id, tokenPurpose) => {
    mockTokens = mockTokens.filter(({ userId, purpose }) => !(userId === id && purpose === tokenPurpose));

    return Promise.resolve();
});

beforeEach(() => {
    jest.clearAllMocks();
    mockUsers = [];
    mockTokens = [];
});

describe('register', () => {

    test('should create token, send registration e-mail and render register form', async () => {
        await ctrl.register(mockReq({ body: { email, password } }), res);

        const user = mockUsers.find(user => user.email === email && user.password === password);
        const registrationToken = mockTokens.find(({ userId, purpose }) => userId === user._id && purpose === TokenPurpose.EmailVerification);

        expect(user).toBeDefined();
        expect(registrationToken).toBeDefined();
        expect(sendRegistrationEmail).toHaveBeenCalledWith(email, registrationToken.token);
        expect(res.render).toHaveBeenCalledWith('auth/register', {
            msg: i18n.__('auth.register.msg.email-sent', { email })
        });
    });

});

describe('login', () => {

    test('should render login form with prompt to enter e-mail and password if token is invalid', async () => {
        const user = await User.create({ email, password });
        const resetToken = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailVerification });
        const query = {
            token: 'foo'
        };
        const req = mockReq({ query });

        await ctrl.renderLogin(req, res);

        expect(res.render).toHaveBeenCalledWith('auth/login', {
            msg: i18n.__('auth.login.msg.token-invalid-prompt'),
            body: {},
            query
        });
    });

    test('should render login form with prompt to login if token is valid', async () => {
        const user = await User.create({ email, password });
        const verificationToken = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailVerification });
        const query = {
            token: verificationToken.token
        };
        const req = mockReq({ query });

        await ctrl.renderLogin(req, res);

        expect(res.render).toHaveBeenCalledWith('auth/login', {
            msg: i18n.__('auth.login.msg.token-valid-prompt'),
            body: {},
            query
        });
    });

    test('should throw error if no user found', async () => {
        try {
            await ctrl.login(mockReq({
                body: { email, password }
            }), res);
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe(i18n.__('auth.login.msg.credentials-invalid'));
        }
    });

    test('should throw error if password does not match', async () => {
        await User.create({ email, password });

        try {
            await ctrl.login(mockReq({
                body: {
                    email,
                    password: 'admin'
                }
            }), res);
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe(i18n.__('auth.login.msg.credentials-invalid'));
        }
    });

    test('should throw error if user not yet verified', async () => {
        await User.create({ email, password });

        try {
            await ctrl.login(mockReq({
                body: { email, password }
            }), res);
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe(i18n.__('auth.login.msg.account-not-verified'));
        }
    });

    test('should throw error and send new token via e-mail if token is invalid or expired', async () => {
        const user = await User.create({ email, password });
        const token = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailVerification });

        try {
            await ctrl.login(mockReq({
                body: { email, password },
                query: {
                    token: 'foo'
                }
            }), res);
        } catch(err) {
            const registrationTokens = mockTokens.filter(({ userId, purpose }) => userId === user._id && purpose === TokenPurpose.EmailVerification);

            expect(registrationTokens).toHaveLength(2);
            expect(sendRegistrationEmail).toHaveBeenCalledWith(email, registrationTokens[1].token);
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe(i18n.__('auth.login.msg.token-invalid'));
        }
    });

    test('should throw error if user is locked', async () => {
        const user = await User.create({ email, password });

        user.isLocked = true;

        try {
            await ctrl.login(mockReq({
                body: { email, password }
            }), res);
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe(i18n.__('auth.login.msg.account-locked'));
        }
    });

    test('should throw error if token belongs to another user', async () => {
        const purpose = TokenPurpose.EmailVerification;
        const userA = await User.create({ email: 'john.doe@example.com', password: 'foobar' });
        const userB = await User.create({ email, password });
        const tokenA = await Token.create({ userId: userA._id, purpose });
        const tokenB = await Token.create({ userId: userB._id, purpose });

        try {
            await ctrl.login(mockReq({
                body: { email, password },
                query: {
                    token: tokenA.token
                }
            }), res);
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe(i18n.__('auth.login.msg.token-not-owner'));
        }
    });

    test('should verify and login user, start trial subscription, redirect to dashboard and delete all registration tokens if token is valid', async () => {
        const purpose = TokenPurpose.EmailVerification;
        const userA = await User.create({ email: 'john.doe@example.com', password: 'foobar' });
        const userB = await User.create({ email, password });
        const tokenA = await Token.create({ userId: userA._id, purpose });
        const tokenB = await Token.create({ userId: userB._id, purpose });
        const tokenC = await Token.create({ userId: userB._id, purpose });

        const req = mockReq({
            body: { email, password },
            query: {
                token: tokenC.token
            }
        });

        await ctrl.login(req, res);
        const registrationTokens = mockTokens.filter(
            ({ userId, purpose }) => userId === userB._id && purpose === TokenPurpose.EmailVerification
        );

        expect(registrationTokens).toHaveLength(0);
        expect(mockTokens).toHaveLength(1);
        expect(userB.isVerified).toBeTruthy();
        expect(userB.subscription.status).toBe(STRIPE_SUBSCRIPTION_STATUS.Trialing);
        expect(stripe.customers.create).toHaveBeenCalledWith({ email });
        expect(userB.save).toHaveBeenCalled();
        expect(req.session.userId).toBe(userB._id);
        expect(res.redirect).toHaveBeenCalledWith(routes('dashboard'));
    });

    test('should login verified user and redirect to callback url', async () => {
        const user = await User.create({ email, password });

        user.isVerified = true;

        const callbackUrl = '/foo';
        const req = mockReq({
            body: { email, password },
            query: { callbackUrl }
        });

        await ctrl.login(req, res);

        expect(req.session.userId).toBe(user._id);
        expect(res.redirect).toHaveBeenCalledWith(callbackUrl);
    });

    test('should login user and redirect to dashboard if provided callback url is absolute', async () => {
        const user = await User.create({ email, password });

        user.isVerified = true;

        const req = mockReq({
            body: { email, password },
            query: { callbackUrl: 'http://foo' }
        });

        await ctrl.login(req, res);

        expect(res.redirect).toHaveBeenCalledWith(routes('dashboard'));
    });

});

describe('forgot password', () => {

    test('should render forgot password form with prompt to enter e-mail if token is invalid', async () => {
        const user = await User.create({ email, password });
        const resetToken = await Token.create({ userId: user._id, purpose: TokenPurpose.PasswordReset });
        const query = {
            token: 'foo'
        };
        const req = mockReq({ query });

        await ctrl.renderForgotPassword(req, res);

        expect(res.render).toHaveBeenCalledWith('auth/forgot', {
            msg: i18n.__('auth.forgot.msg.token-invalid-prompt'),
            isVerified: false,
            body: {},
            query
        });
    });

    test('should render forgot password form with prompt to set new password if token is valid', async () => {
        const user = await User.create({ email, password });
        const resetToken = await Token.create({ userId: user._id, purpose: TokenPurpose.PasswordReset });
        const query = {
            token: resetToken.token
        };
        const req = mockReq({ query });

        await ctrl.renderForgotPassword(req, res);

        expect(res.render).toHaveBeenCalledWith('auth/forgot', {
            msg: i18n.__('auth.forgot.msg.token-valid-prompt'),
            isVerified: true,
            body: {},
            query
        });
    });

    test('should render forgot password form with success message even though e-mail is not used', async () => {
        const req = mockReq({
            body: { email }
        });

        await ctrl.resetPassword(req, res);

        expect(res.render).toHaveBeenCalledWith('auth/forgot', {
            msg: i18n.__('auth.forgot.msg.email-sent', { email })
        });
    });

    test('should render forgot password form with success message and send new password reset token via e-mail', async () => {
        const user = await User.create({ email, password });
        const req = mockReq({
            body: { email }
        });

        await ctrl.resetPassword(req, res);

        const resetToken = mockTokens.find(({ userId, purpose }) => userId === user._id && purpose === TokenPurpose.PasswordReset);

        expect(resetToken).toBeDefined();
        expect(sendPasswordResetEmail).toHaveBeenCalledWith(email, resetToken.token);
        expect(res.render).toHaveBeenCalledWith('auth/forgot', {
            msg: i18n.__('auth.forgot.msg.email-sent', { email })
        });
    });

    test('should throw error if provided token is invalid or expired', async () => {
        const user = await User.create({ email, password });
        const req = mockReq({
            body: { password },
            query: {
                token: 'foo'
            }
        });

        try {
            await ctrl.resetPassword(req, res);
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe(i18n.__('auth.forgot.msg.token-invalid-prompt'));
        }
    });

    test('should change user password, render login form, delete all password reset tokens and clean all user sessions if token is valid', async () => {
        const userA = await User.create({ email: 'john.doe@example.com', password: 'foobar' });
        const userB = await User.create({ email, password });
        const tokenA = await Token.create({ userId: userA._id, purpose: TokenPurpose.EmailVerification });
        const tokenB = await Token.create({ userId: userB._id, purpose: TokenPurpose.PasswordReset });
        const tokenC = await Token.create({ userId: userB._id, purpose: TokenPurpose.PasswordReset });
        const tokenD = await Token.create({ userId: userB._id, purpose: TokenPurpose.AccountCancellation });
        const newPassword = 'foo';
        const req = mockReq({
            body: { password: newPassword },
            query: {
                token: tokenC.token
            }
        });

        await ctrl.resetPassword(req, res);

        const userBResetTokens = mockTokens.filter(({ userId, purpose }) => userId === userB._id && purpose === TokenPurpose.PasswordReset);

        expect(userBResetTokens).toHaveLength(0);
        expect(mockTokens).toHaveLength(2);
        expect(userB.save).toHaveBeenCalled();
        expect(userB.password).toBe(newPassword);
        expect(Session.cleanSessions).toHaveBeenCalledWith(userB._id);
        expect(res.render).toHaveBeenCalledWith('auth/login', {
            msg: i18n.__('auth.forgot.msg.success')
        });
    });

});

describe('authentication', () => {

    test('should populate request object with user if session is active', async () => {
        const user = await User.create({ email, password });

        const next = jest.fn();
        const req = mockReq({
            session: {
                userId: user._id
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
        const user = await User.create({ email, password });

        user.isLocked = true;

        const next = jest.fn();
        const req = mockReq({
            session: {
                userId: user._id,
                destroy: jest.fn(callback => callback())
            }
        });

        await ctrl.authenticate(req, res, next);

        expect(req.user).toBeUndefined();
        expect(req.session.destroy).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith(routes('landing'));
        expect(next).not.toHaveBeenCalled();
    });

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
