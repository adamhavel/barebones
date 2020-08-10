import express from 'express';
import { stopUnauthorized } from '../controllers/auth.js';
import routes from '../config/routes.js';

const settings = express.Router();

settings.use(stopUnauthorized);

settings.get(routes('settings'), (req, res) => {
    res.render('settings/general');
});

export default settings;