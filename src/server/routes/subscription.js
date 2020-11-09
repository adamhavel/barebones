import express from 'express';

import routes from '../config/routes.js';
import * as ctrl from '../controllers/subscription.js';
import { render } from '../controllers/utils.js';
import { stopUnauthenticated } from '../controllers/auth.js';

const subscription = express.Router();

subscription.route(routes('subscription'))
    .all(stopUnauthenticated)
    .get(render('subscription/checkout'));

export default subscription;