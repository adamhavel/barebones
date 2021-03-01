import express from 'express';
import routes from '../../common/routes.js';
import { stopAuthenticated } from '../controllers/auth.js';
import { render } from '../controllers/utils.js';

const landing = express.Router();

landing
    .route(routes('landing'))
    .all(stopAuthenticated)
    .get(render('landing'))

export default landing;