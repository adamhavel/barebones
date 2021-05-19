import i18n from 'i18n';
import x from '../../common/routes.js';
import User from '../models/user.js';
import Session from '../models/session.js';
import stripe from '../services/stripe.js';
import { sendEmailAddressUpdateEmails } from '../services/mail.js';
import { regenerateSession, depopulateSession } from './auth.js';
import Token, { TokenPurpose } from '../models/token.js';
import { AuthError } from '../models/error.js';
import { FlashType } from '../models/flash.js';

export async function validateEmailUpdate(req, res, next) {
    const { user, query: { token }, session } = req;

    if (token && user.emailCandidate) {
        const validToken = await Token.findOne({ token, purpose: TokenPurpose.EmailUpdate, userId: user._id });

        if (!validToken) {
            throw new AuthError(i18n.__('settings.account.update-email.msg.token-invalid-prompt'));
        }

        user.email = user.emailCandidate;
        user.emailCandidate = undefined;

        await stripe.customers.update(
            user.subscription.customerId,
            { email: user.email }
        );

        await user.save();
        await Token.deleteAll(user._id, TokenPurpose.EmailUpdate);
        await Session.revokeSessions(user._id, session.id);

        res.locals.user = user;
        res.flash(FlashType.Info, i18n.__('settings.account.update-email.msg.success'));
    }

    next?.();
}

// TODO: Cancel Stripe subscription.
export async function deleteAccount(req, res, next) {
    const { user, session } = req;
    const { subscriptionId } = user.subscription;

    user.deletedAt = Date.now();

    if (subscriptionId) {
        user.subscription.isRenewed = false;
        await stripe.subscriptions.update(
            subscriptionId,
            { 'cancel_at_period_end': true }
        );
    }

    await user.save();
    await Session.revokeSessions(user._id, session.id);

    depopulateSession(req);
    res.flash(FlashType.Info, i18n.__('settings.account.delete-account.msg.success'));
    next?.();
}

// TODO: Add regenerate session call.
export async function updatePassword(req, res, next) {
    const { user, session } = req;

    user.password = req.body.newPassword;

    await user.save();
    await Session.revokeSessions(user._id, session.id);

    res.flash(FlashType.Info, i18n.__('settings.account.update-password.msg.success'));
    next?.();
}

// TODO: Make custom validation
// TODO: Add regenerate session call.
export async function updateEmail(req, res, next) {
    const { user, body: { email } } = req;

    user.emailCandidate = email;

    await user.save();
    await Token.deleteAll(user._id, TokenPurpose.EmailUpdate);

    const { token } = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailUpdate });

    sendEmailAddressUpdateEmails(user.email, email, token);

    res.flash(FlashType.Info, i18n.__('settings.account.update-email.msg.email-sent', { email }));
    next?.();
}
