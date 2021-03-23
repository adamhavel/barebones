import i18n from 'i18n';
import moment from 'moment';

import x from '../../common/routes.js';
import * as ctrl from './subscription.js';
import User from '../models/user.js';
import { TRIAL_PERIOD_DAYS } from '../models/subscription.js';
import stripe, { SubscriptionStatus } from '../services/stripe.js';
import { FlashType } from '../models/flash.js';

beforeEach(clearMocks);

describe('trialing', () => {

    test('should call next middleware if subscription is active', async () => {
        const user = await User.create({ email, password });

        user.subscription = {
            status: SubscriptionStatus.Active,
            // Subscription ends at the of the day.
            endsAt: moment().toDate()
        };

        const req = mockReq({ user });

        await ctrl.stopUnsubscribed(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('should call next middleware if trial is active', async () => {
        const user = await User.create({ email, password });

        user.subscription = {
            status: SubscriptionStatus.Trialing,
            endsAt: moment().add(TRIAL_PERIOD_DAYS / 2, 'days').toDate()
        };

        const req = mockReq({ user });

        await ctrl.stopUnsubscribed(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('should redirect to subscription if trial is over', async () => {
        const user = await User.create({ email, password });

        user.subscription = {
            status: SubscriptionStatus.Trialing,
            endsAt: moment().subtract(1, 'days').toDate()
        };

        const req = mockReq({ user });

        await ctrl.stopUnsubscribed(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith(x('/subscription'));
        expect(res.flash).toHaveBeenCalledWith(FlashType.Info, i18n.__('subscription.msg.trial-ended'));
        expect(next).not.toHaveBeenCalled();
    });

});