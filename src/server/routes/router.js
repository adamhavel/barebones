import express from 'express';

import { stopUnauthenticated, stopAuthenticated } from '../controllers/auth.js';
import { stopUnsubscribed } from '../controllers/subscription.js';
import x from '../../common/routes.js';
import metrics from './metrics.js';
import landing from './landing.js';
import dashboard from './dashboard.js';
import auth from './auth.js';
import settings from './settings.js';
import subscription from './subscription.js';

const router = express.Router();

router.use(
    [x('/dashboard'), x('/settings'), x('/subscription')],
    stopUnauthenticated
);

router.use(
    [x('/auth')],
    stopAuthenticated
);

router.use(
    [x('/dashboard')],
    stopUnsubscribed
);

router.use(
    metrics,
    landing,
    dashboard,
    auth,
    settings,
    subscription
);

export default router;
