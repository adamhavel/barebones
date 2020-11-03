import express from 'express';

import metrics from './metrics.js';
import home from './home.js';
import auth from './auth.js';
import settings from './settings.js';
import payment from './payment.js';

const router = express.Router();

router.use(metrics);
router.use(home);
router.use(auth);
router.use(settings);
router.use(payment);

export default router;
