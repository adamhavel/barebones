import routes from '../config/routes.js';
import { SubscriptionStatus } from '../models/user.js';

export function stopUnsubscribed(req, res, next) {
    const status = req?.user.subscription.status;

    console.log(status);

    if (status !== SubscriptionStatus.Active && status !== SubscriptionStatus.Trialing) {
        res.redirect(routes('subscription'));
    } else {
        next();
    }
}