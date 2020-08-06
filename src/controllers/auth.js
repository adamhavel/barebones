import express from 'express';

const auth = express.Router();

auth.get('/', (req, res) => {
    res.render('landing');
});

export default auth;