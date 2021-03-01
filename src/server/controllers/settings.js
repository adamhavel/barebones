import i18n from 'i18n';
import routes from '../../common/routes.js';
import User from '../models/user.js';
import Session from '../models/session.js';
import { sendEmailAddressUpdateEmails } from '../services/mail.js';
import { logout, regenerateSession } from './auth.js';
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

        await user.save();
        await Token.deleteAll(user._id, TokenPurpose.EmailUpdate);
        await Session.revokeSessions(user._id, session.id);

        res.locals.user = user;
        res.locals.msg = {
            text: i18n.__('settings.account.update-email.msg.success'),
            type: 'info'
        };
    }

    next();
}

export async function deleteAccount(req, res) {
    const { user } = req;

    user.deletedAt = Date.now();

    await user.save();
    await Session.revokeSessions(user._id);

    res.redirect(routes('/landing'));
}

export async function updatePassword(req, res) {
    const { user, session } = req;

    user.password = req.body.newPassword;

    await user.save();
    await Session.revokeSessions(user._id, session.id);
    await regenerateSession(req);

    res.render('settings/general', {
        msg: {
            text: i18n.__('settings.account.update-password.msg.success'),
            type: 'info'
        }
    });
}

// TODO: Make custom validation
export async function updateEmail(req, res) {
    const { user, body: { email } } = req;

    user.emailCandidate = email;

    await user.save();
    await Token.deleteAll(user._id, TokenPurpose.EmailUpdate);

    const { token } = await Token.create({ userId: user._id, purpose: TokenPurpose.EmailUpdate });

    sendEmailAddressUpdateEmails(user.email, email, token);

    res.render('settings/general', {
        msg: {
            text: i18n.__('settings.account.update-email.msg.email-sent', { email }),
            type: 'info'
        }
    });
}
