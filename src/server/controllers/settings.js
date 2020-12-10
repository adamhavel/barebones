import routes from '../../common/routes.js';
import User from '../models/user.js';
import Session from '../models/session.js';
import { logout, regenerateSession } from './auth.js';

export async function updateAccount(req, res, next) {
    const { type } = req.body;

    switch (type) {
        case 'password':
            req.user.password = req.body.newPassword;
            req.user = await req.user.save();
            await Session.cleanSessions(req.user._id, req.session.id);
            await regenerateSession(req);
            break;

        case 'email':
            req.user.email = req.body.email;
            req.user = await req.user.save();
            break;

        case 'delete':
            // TODO: Delete all tokens.
            await User.findByIdAndDelete(req.user._id);
            return logout(req, res);

    }

    res.render('settings/account', {
        msg: ''
    });
}