import express from 'express';
import x from '../../common/routes.js';
import { render } from '../controllers/utils.js';

const landing = express.Router();

landing
    .route(x('/landing'))
    .get(render('landing'));

export default landing;