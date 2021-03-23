import i18n from 'i18n';
import moment from 'moment';
import Url from 'url';

import x from '../../common/routes.js';
import * as ctrl from './auth.js';
import { sendRegistrationEmail, sendPasswordResetEmail } from '../services/mail.js';
import User from '../models/user.js';
import { TRIAL_PERIOD_DAYS } from '../models/subscription.js';
import stripe, { SubscriptionStatus } from '../services/stripe.js';
import Session from '../models/session.js';
import Token, { TokenPurpose } from '../models/token.js';
import { FlashType } from '../models/flash.js';

beforeEach(clearMocks);

describe('register', () => {

    test('should create token, send registration e-mail and render register form', async () => {
        await ctrl.register(mockReq({ body: { email, password } }), res, next);

        const user = mockUsers.find(user => user.email === email && user.password === password);
        const { token } = mockTokens.find(({ userId, purpose }) => userId === user._id && purpose === TokenPurpose.AccountVerification);

        expect(user).toBeDefined();
        expect(token).toBeDefined();
        expect(sendRegistrationEmail).toHaveBeenCalledWith(email, token);
        expect(res.flash).toHaveBeenCalledWith(FlashType.Info, i18n.__('auth.register.msg.email-sent', { email }));
        expect(next).toHaveBeenCalled();
    });

});

describe('login', () => {

    test('should render message with prompt to enter credentials if token is invalid', async () => {
        const user = await User.create({ email, password });
        const req = mockReq({ query: { token: 'foo' } });

        await Token.create({ userId: user._id, purpose: TokenPurpose.AccountVerification });
        await ctrl.validateToken(TokenPurpose.AccountVerification)(req, res, next);

        expect(res.flash).toHaveBeenCalledWith(FlashType.Info, i18n.__('auth.login.msg.token-invalid-prompt'));
        expect(next).toHaveBeenCalled();
    });

    test('should render message with prompt to login if token is valid', async () => {
        const user = await User.create({ email, password });
        const { token } = await Token.create({ userId: user._id, purpose: TokenPurpose.AccountVerification });
        const req = mockReq({ query: { token } });

        await ctrl.validateToken(TokenPurpose.AccountVerification)(req, res, next);

        expect(res.flash).toHaveBeenCalledWith(FlashType.Info, i18n.__('auth.login.msg.token-valid-prompt'));
        expect(next).toHaveBeenCalled();
    });

    test('should throw error if no user found', async () => {
        try {
            await ctrl.login(mockReq({
                body: { email, password }
            }), res, next);
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
            }), res, next);
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
            }), res, next);
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe(i18n.__('auth.login.msg.account-not-verified'));
        }
    });

    test('should throw error and send new token via e-mail if token is invalid or expired', async () => {
        const user = await User.create({ email, password });

        try {
            await Token.create({ userId: user._id, purpose: TokenPurpose.AccountVerification });
            await ctrl.login(mockReq({
                body: { email, password },
                query: {
                    token: 'foo'
                }
            }), res, next);
        } catch(err) {
            const registrationTokens = mockTokens.filter(({ userId, purpose }) => userId === user._id && purpose === TokenPurpose.AccountVerification);

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
            }), res, next);
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe(i18n.__('auth.login.msg.account-locked'));
        }
    });

    test('should verify and login user, start trial subscription, redirect to dashboard and delete all registration tokens if token is valid', async () => {
        const purpose = TokenPurpose.AccountVerification;
        const userA = await User.create({ email: 'john.doe@example.com', password: 'foobar' });
        const userB = await User.create({ email, password });
        const tokenA = await Token.create({ userId: userA._id, purpose });
        const tokenB = await Token.create({ userId: userB._id, purpose });
        const tokenC = await Token.create({ userId: userB._id, purpose });
        const trialEndsAt = moment().add(TRIAL_PERIOD_DAYS, 'days');

        const req = mockReq({
            body: { email, password },
            query: {
                token: tokenC.token
            }
        });

        await ctrl.login(req, res, next);
        const registrationTokens = mockTokens.filter(
            ({ userId, purpose }) => userId === userB._id && purpose === TokenPurpose.AccountVerification
        );

        expect(registrationTokens).toHaveLength(0);
        expect(mockTokens).toHaveLength(1);
        expect(userB.isVerified).toBeTruthy();
        expect(userB.subscription.stripeCustomerId).toBeDefined();
        expect(userB.subscription.status).toBe(SubscriptionStatus.Trialing);
        expect(moment(userB.subscription.endsAt).isSame(trialEndsAt, 'second')).toBeTruthy();
        expect(stripe.customers.create).toHaveBeenCalledWith({ email });
        expect(userB.save).toHaveBeenCalled();
        expect(req.session.userId).toBe(userB._id);
        expect(next).toHaveBeenCalled();
    });

    test('should verify and login user, and pair with existing Stripe customer', async () => {
        const purpose = TokenPurpose.AccountVerification;
        const userA = await User.create({ email: 'john.doe@example.com', password: 'foobar' });
        const userB = await User.create({ email, password });
        const tokenA = await Token.create({ userId: userA._id, purpose });
        const tokenB = await Token.create({ userId: userB._id, purpose });
        const tokenC = await Token.create({ userId: userB._id, purpose });
        const trialEndsAt = moment().add(TRIAL_PERIOD_DAYS, 'days');

        const req = mockReq({
            body: { email, password },
            query: {
                token: tokenC.token
            }
        });

        await ctrl.login(req, res, next);
        const registrationTokens = mockTokens.filter(
            ({ userId, purpose }) => userId === userB._id && purpose === TokenPurpose.AccountVerification
        );

        expect(registrationTokens).toHaveLength(0);
        expect(mockTokens).toHaveLength(1);
        expect(userB.isVerified).toBeTruthy();
        expect(userB.subscription.stripeCustomerId).toBeDefined();
        expect(userB.subscription.status).toBe(SubscriptionStatus.Trialing);
        expect(moment(userB.subscription.endsAt).isSame(trialEndsAt, 'second')).toBeTruthy();
        expect(stripe.customers.create).toHaveBeenCalledWith({ email });
        expect(userB.save).toHaveBeenCalled();
        expect(req.session.userId).toBe(userB._id);
        expect(next).toHaveBeenCalled();
    });

    test('should login verified user and redirect to callback url', async () => {
        const user = await User.create({ email, password });

        user.isVerified = true;

        const callbackUrl = '/foo';
        const req = mockReq({
            body: { email, password },
            query: { callbackUrl }
        });

        await ctrl.login(req, res, next);

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

        await ctrl.login(req, res, next);

        expect(res.redirect).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    test('should reopen account after login to cancelled account before expiration date', async () => {
        const user = await User.create({ email, password });

        user.isVerified = true;
        user.deletedAt = Date.now();

        const req = mockReq({
            body: { email, password }
        });

        await ctrl.login(req, res, next);

        expect(user.deletedAt).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });

});

describe('forgot password', () => {

    test('should render forgot password form with prompt to enter e-mail if token is invalid', async () => {
        const user = await User.create({ email, password });
        const req = mockReq({ query: { token: 'foo' } });

        await Token.create({ userId: user._id, purpose: TokenPurpose.PasswordReset });
        await ctrl.validateToken(TokenPurpose.PasswordReset)(req, res, next);

        expect(res.flash).toHaveBeenCalledWith(FlashType.Info, i18n.__('auth.reset.msg.token-invalid-prompt'));
        expect(next).toHaveBeenCalled();
    });

    test('should render forgot password form with prompt to set new password if token is valid', async () => {
        const user = await User.create({ email, password });
        const { token } = await Token.create({ userId: user._id, purpose: TokenPurpose.PasswordReset });
        const req = mockReq({ query: { token } });

        await ctrl.validateToken(TokenPurpose.PasswordReset)(req, res, next);

        expect(res.flash).toHaveBeenCalledWith(FlashType.Info, i18n.__('auth.reset.msg.token-valid-prompt'));
        expect(next).toHaveBeenCalled();
    });

    test('should render forgot password form with success message even though e-mail is not used', async () => {
        const req = mockReq({
            body: { email }
        });

        await ctrl.initiatePasswordReset(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.flash).toHaveBeenCalledWith(FlashType.Info, i18n.__('auth.reset.msg.email-sent', { email }));
    });

    test('should render forgot password form with success message and send new password reset token via e-mail', async () => {
        const user = await User.create({ email, password });
        const req = mockReq({
            body: { email }
        });

        await ctrl.initiatePasswordReset(req, res, next);

        const { token } = mockTokens.find(({ userId, purpose }) => userId === user._id && purpose === TokenPurpose.PasswordReset);

        expect(token).toBeDefined();
        expect(sendPasswordResetEmail).toHaveBeenCalledWith(email, token);
        expect(next).toHaveBeenCalled();
        expect(res.flash).toHaveBeenCalledWith(FlashType.Info, i18n.__('auth.reset.msg.email-sent', { email }));
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
            await ctrl.resetPassword(req, res, next);
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe(i18n.__('auth.reset.msg.token-invalid-prompt'));
        }
    });

    test('should change user password, render login form, delete all password reset tokens and clean all user sessions if token is valid', async () => {
        const userA = await User.create({ email: 'john.doe@example.com', password: 'foobar' });
        const userB = await User.create({ email, password });
        const tokenA = await Token.create({ userId: userA._id, purpose: TokenPurpose.AccountVerification });
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

        await ctrl.resetPassword(req, res, next);

        const userBResetTokens = mockTokens.filter(({ userId, purpose }) => userId === userB._id && purpose === TokenPurpose.PasswordReset);

        expect(userBResetTokens).toHaveLength(0);
        expect(mockTokens).toHaveLength(2);
        expect(userB.save).toHaveBeenCalled();
        expect(userB.password).toBe(newPassword);
        expect(Session.revokeSessions).toHaveBeenCalledWith(userB._id);
        expect(next).toHaveBeenCalled();
        expect(res.flash).toHaveBeenCalledWith(FlashType.Info, i18n.__('auth.reset.msg.success'));
    });

});

describe('authentication', () => {

    test('should populate request object with user if session is active', async () => {
        const user = await User.create({ email, password });
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

        const req = mockReq({
            session: {
                userId: user._id,
                destroy: jest.fn(callback => callback())
            }
        });

        await ctrl.authenticate(req, res, next);

        expect(req.user).toBeUndefined();
        expect(req.session.destroy).toHaveBeenCalled();
    });

    test('should return 401 and render login form with callback URL if user is not authenticated', () => {
        const url = '/foo';
        const query = {
            bar: 'baz'
        };

        ctrl.stopUnauthenticated(mockReq({ originalUrl: url, query }), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.flash).toHaveBeenCalledWith(FlashType.Info, i18n.__('auth.login.msg.login-prompt'));
        expect(res.render).toHaveBeenCalledWith('auth/login', {
            querystring: Url.format({
                query: {
                    ...query,
                    callbackUrl: url
                }
            })
        });
        expect(next).not.toHaveBeenCalled();
    });

    test('should call next middleware if user is authenticated', () => {
        ctrl.stopUnauthenticated(mockReq({ user: {} }), res, next);

        expect(res.render).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

});
