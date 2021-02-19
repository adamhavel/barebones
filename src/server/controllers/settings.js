import routes from '../../common/routes.js';
import User from '../models/user.js';
import Session from '../models/session.js';
import { logout, regenerateSession } from './auth.js';

export async function deleteAccount(req, res) {
    req.user.deletedAt = Date.now();
    req.user = await req.user.save();

    await Session.revokeSessions(req.user._id);

    res.redirect(routes('landing'));
}

export async function updatePassword(req, res) {
    req.user.password = req.body.newPassword;
    req.user = await req.user.save();

    await Session.revokeSessions(req.user._id, req.session.id);
    await regenerateSession(req);

    res.render('settings/general', {
        msg: {
            text: 'Heslo zmeneno.',
            type: 'info'
        }
    });
}