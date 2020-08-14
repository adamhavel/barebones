import routes from '../config/routes.js';
import User from '../models/user.js';
import { logout, regenerateSession } from './auth.js';

export async function updateAccount(req, res) {
    const { type } = req.body;

    switch (type) {
        case 'password':
            req.user.password = req.body.newPassword;
            break;
        case 'email':
            req.user.email = req.body.email;
            break;
        case 'delete':
            await User.findByIdAndDelete(req.user.id);
            return logout(req, res);
    }

    req.user = await req.user.save();
    await regenerateSession(req);
    res.render('settings/account', { msg: '' });
}