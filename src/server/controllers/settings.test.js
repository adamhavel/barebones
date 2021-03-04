import crypto from 'crypto';
import i18n from 'i18n';
import db from 'mongoose';
import moment from 'moment';
import Url from 'url';

import x from '../../common/routes.js';
import * as ctrl from './settings.js';
import { sendRegistrationEmail, sendPasswordResetEmail } from '../services/mail.js';
import User from '../models/user.js';
import { TRIAL_PERIOD_DAYS } from '../models/subscription.js';
import stripe, { StripeSubscriptionStatus } from '../services/stripe.js';
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

beforeEach(() => {
    jest.clearAllMocks();
    mockUsers = [];
    mockTokens = [];
});

describe('update password', () => {

    test('should update password, revoke all other sessions, and render settings', async () => {
        const user = await User.create({ email, password });
        const newPassword = 'foobar';
        const sessionId = crypto.randomBytes(8).toString('hex');
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
