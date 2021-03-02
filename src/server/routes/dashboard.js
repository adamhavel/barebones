import express from 'express';
import x from '../../common/routes.js';
import { render } from '../controllers/utils.js';

const dashboard = express.Router();

dashboard.get(x('/dashboard'), render('dashboard'))

export default dashboard;