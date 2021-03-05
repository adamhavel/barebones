import i18n from 'i18n';
import moment from 'moment';

import x from '../../common/routes.js';
import * as ctrl from './settings.js';
import { sendEmailAddressUpdateEmails } from '../services/mail.js';
import User from '../models/user.js';
import stripe, { StripeSubscriptionStatus } from '../services/stripe.js';
import Session from '../models/session.js';
import Token, { TokenPurpose } from '../models/token.js';

beforeEach(clearMocks);

describe('update password', () => {

    test('should update password, revoke all other sessions, and render settings', async () => {
        const user = await User.create({ email, password });
        const newPassword = 'foobar';
        const sessionId = randomHex();
        const req = mockReq({
            user,
            session: { id: sessionId },
            body: { newPassword }
        });

        await ctrl.updatePassword(req, res);

        expect(user.password).toBe(newPassword);
        expect(Session.revokeSessions).toHaveBeenCalledWith(user._id, sessionId);
        expect(res.render).toHaveBeenCalledWith('settings/general', {
            msg: {
                text: i18n.__('settings.account.update-password.msg.success'),
                type: 'info'
            }
        });
    });

});

describe('delete account', () => {

    test('should mark account as deleted, revoke all sessions, and redirect to landing page', async () => {
        const user = await User.create({ email, password });
        const req = mockReq({ user });

        await ctrl.deleteAccount(req, res);

        expect(moment(user.deletedAt).isSame(moment(), 'second')).toBeTruthy();
        expect(Session.revokeSessions).toHaveBeenCalledWith(user._id);
        expect(res.redirect).toHaveBeenCalledWith(x('/landing'));
    });

});

describe('update email', () => {

    test('should initiate email update, send a verification mail, and render settings', async () => {
        const user = await User.create({ email, password });
        const newEmail = 'jane.doe@protonmail.com';
        const req = mockReq({
            user,
            body: { email: newEmail }
        });

        await ctrl.updateEmail(req, res);

        const { token } = mockTokens.find(({ userId, purpose }) => userId === user._id && purpose === TokenPurpose.EmailUpdate);

        expect(user.emailCandidate).toBe(newEmail);
        expect(token).toBeDefined();
        expect(sendEmailAddressUpdateEmails).toHaveBeenCalledWith(user.email, newEmail, token);
        expect(res.render).toHaveBeenCalledWith('settings/general', {
            msg: {
                text: i18n.__('settings.account.update-email.msg.email-sent', { email: newEmail }),
                type: 'info'
            }
        });
    });

    test('should throw error if provided token is invalid or expired', async () => {
        const newEmail = 'jane.doe@protonmail.com';
        const user = {
            ...await User.create({ email, password }),
            emailCandidate: newEmail,
            subscription: {
                stripeCustomerId: randomHex()
            }
        };
        const { token } = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailUpdate });
        const sessionId = randomHex();
        const next = jest.fn();
        const req = mockReq({
            user,
            query: { token: 'foo' },
            session: { id: sessionId },
        });

        try {
            await ctrl.validateEmailUpdate(req, res, next);
        } catch(err) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe(i18n.__('settings.account.update-email.msg.token-invalid-prompt'));
        }
    });

    test('should update email, update Stripe customer, revoke all other sessions, and call next middleware', async () => {
        const newEmail = 'jane.doe@protonmail.com';
        const user = {
            ...await User.create({ email, password }),
            emailCandidate: newEmail,
            subscription: {
                stripeCustomerId: randomHex()
            }
        };
        const { token } = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailUpdate });
        const sessionId = randomHex();
        const next = jest.fn();
        const req = mockReq({
            user,
            query: { token },
            session: { id: sessionId },
        });

        await ctrl.validateEmailUpdate(req, res, next);

        expect(user.emailCandidate).toBeUndefined();
        expect(user.email).toBe(newEmail);
        expect(stripe.customers.update).toHaveBeenCalledWith(
            user.subscription.stripeCustomerId,
            { email: newEmail }
        );
        expect(mockTokens).toHaveLength(0);
        expect(Session.revokeSessions).toHaveBeenCalledWith(user._id, sessionId);
        expect(res.locals.msg).toStrictEqual({
            text: i18n.__('settings.account.update-email.msg.success'),
            type: 'info'
        });
        expect(next).toHaveBeenCalled();
    });

});

