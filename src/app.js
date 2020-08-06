import express from 'express';
import session from 'express-session';
import sessionStoreFactory from 'connect-mongo';
import compression from 'compression';
import nunjucks from 'nunjucks';
import { db, client } from './db.js';
import router from './routes.js';

const {
    NODE_PORT: port,
    NODE_COOKIE_SECRET: secret,
    NODE_ENV: env
} = process.env;

const app = express();
const sessionStore = sessionStoreFactory(session);


// Setup
app.set('trust proxy', true);
app.set('view engine', 'html');
app.set('x-powered-by', false);


// Templating
nunjucks.configure('src/views', {
    autoescape: true,
    express: app
});


// Middleware
app.use(compression());
app.use(session({
    name: 'stamp',
    secret,
    resave: false,
    saveUninitialized: true,
    store: new sessionStore({ client }),
    cookie: {
        sameSite: 'lax'
    }
}))
app.use(router);


// Errors
app.use((err, req, res, next) => {
    res.status(500);

    if (env === 'development') {
        res.send(err.stack);
    } else {
        res.render('errors/general');
    }
});

app.use((req, res, next) => {
    res.status(404).render('errors/not-found');
});


app.listen(port, () => {
    console.log(`Listening at http://localhost:${port} in ${env} mode.`)
});

export default app;
