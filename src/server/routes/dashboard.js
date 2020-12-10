import express from 'express';
import routes from '../../common/routes.js';
import { stopUnauthenticated } from '../controllers/auth.js';
import { stopUnsubscribed } from '../controllers/subscription.js';
import { render } from '../controllers/utils.js';

const dashboard = express.Router();

dashboard
    .route(routes('dashboard'))
    .all(stopUnauthenticated)
    .all(stopUnsubscribed)
    .get(render('dashboard'))

export default dashboard;