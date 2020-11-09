import express from 'express';

import metrics from './metrics.js';
import landing from './landing.js';
import dashboard from './dashboard.js';
import auth from './auth.js';
import settings from './settings.js';
import subscription from './subscription.js';

const router = express.Router();

router.use(metrics);
router.use(landing);
router.use(dashboard);
router.use(auth);
router.use(settings);
router.use(subscription);

export default router;
