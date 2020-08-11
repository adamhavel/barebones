import express from 'express';

import home from './home.js';
import auth from './auth.js';
import settings from './settings.js';

const router = express.Router();

router.use(home);
router.use(auth);
router.use(settings);

export default router;
