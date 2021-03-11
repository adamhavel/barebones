import i18n from 'i18n';
import x from '../../common/routes.js';
import User from '../models/user.js';
import Session from '../models/session.js';
import stripe from '../services/stripe.js';
import { sendEmailAddressUpdateEmails } from '../services/mail.js';
import { regenerateSession } from './auth.js';
import Token, { TokenPurpose } from '../models/token.js';
import { AuthError } from '../models/error.js';

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
            user.subscription.stripeCustomerId,
            { email: user.email }
        );

        await user.save();
        await Token.deleteAll(user._id, TokenPurpose.EmailUpdate);
        await Session.revokeSessions(user._id, session.id);

        res.locals.user = user;
        res.flash('info', i18n.__('settings.account.update-email.msg.success'));
    }

    next?.();
}

export async function deleteAccount(req, res, next) {
    const { user, session } = req;

    user.deletedAt = Date.now();

    await user.save();
    await Session.revokeSessions(user._id, session.id);

    // TODO: Add depopulate fn.
    delete req.session.userId;
    // TODO: Add i18n
    res.flash('info', 'Účet byl pozastaven. Do 30 dní ho lze obnovit přihlášením, poté bude nenávratně smazán.');
    next?.();
}

export async function updatePassword(req, res, next) {
    const { user, session } = req;

    user.password = req.body.newPassword;

    await user.save();
    await Session.revokeSessions(user._id, session.id);

    res.flash('info', i18n.__('settings.account.update-password.msg.success'));
    next?.();
}

// TODO: Make custom validation
export async function updateEmail(req, res, next) {
    const { user, body: { email } } = req;

    user.emailCandidate = email;

    await user.save();
    await Token.deleteAll(user._id, TokenPurpose.EmailUpdate);

    const { token } = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailUpdate });

    sendEmailAddressUpdateEmails(user.email, email, token);

    res.flash('info', i18n.__('settings.account.update-email.msg.email-sent', { email }));
    next?.();
}
