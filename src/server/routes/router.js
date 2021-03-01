import express from 'express';

import routes from '../../common/routes.js';
import metrics from './metrics.js';
import landing from './landing.js';
import dashboard from './dashboard.js';
import auth from './auth.js';
import settings from './settings.js';
import subscription from './subscription.js';

const router = express.Router();

router.use(metrics);
router.use(landing);
router.use(routes('/dashboard'), dashboard);
router.use(routes('/auth'), auth);
router.use(routes('/settings'), settings);
router.use(routes('/subscription'), subscription);

export default router;
