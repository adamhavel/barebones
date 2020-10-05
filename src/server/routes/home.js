import express from 'express';
import routes from '../config/routes.js';

const home = express.Router();

home.get(routes('home'), (req, res) => {
    if (req.user) {
        res.render('home');
    } else {
        res.render('landing');
    }
});

export default home;