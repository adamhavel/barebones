import express from 'express';

import home from './home.js';
import auth from './auth.js';
import settings from './settings.js';

const router = express.Router();

router.use((req, res, next) => {
    res.locals.query = req.query;
    res.locals.body = req.body;
    next();
});

router.use(home);
router.use(auth);
router.use(settings);

export default router;
