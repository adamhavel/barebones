import routes from '../config/routes.js';

export async function updateSettings(req, res) {
    const { property } = req.body;

    switch (property) {
        case 'password':
        case 'email':
            req.user[property] = req.body[property];
            req.user = await req.user.save();
            break;
    }

    // TODO: Add message.
    res.render('settings/general', { msg: '' });
}