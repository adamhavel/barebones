import express from 'express';

import routes from '../config/routes.js';
import * as ctrl from '../controllers/payment.js';
import { stopUnauthenticated } from '../controllers/auth.js';

const payment = express.Router();

payment.route(routes('payment'))
    .all(stopUnauthenticated);

export default payment;