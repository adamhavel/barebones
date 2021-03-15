import express from 'express';
import session from 'express-session';
import sessionStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import compression from 'compression';
import nunjucks from 'nunjucks';
import mongoose from 'mongoose';
import i18n from 'i18n';
import Url from 'url';

import { authenticate } from './controllers/auth.js';
import { flash } from './controllers/flash.js';
import router from './routes/router.js';
import x from '../common/routes.js';
import { initMailQueue } from './services/mail.js';

// Environment
const {
    NODE_PORT: port,
    NODE_SESSION_COOKIE: sessionCookieName,
    NODE_COOKIE_SECRET: cookieSecret,
    NODE_ENV: env,
    MONGO_PORT: dbPort,
    MONGO_DB: dbName
} = process.env;
const app = express();

app.set('trust proxy', true);
app.set('view engine', 'html');
app.set('x-powered-by', false);

nunjucks
    .configure('src/server/views', {
        autoescape: true,
        express: app,
        noCache: true
    })
    .addGlobal('x', x);

i18n.configure({
    directory: 'src/server/locales',
    defaultLocale: 'cs',
    objectNotation: true,
    updateFiles: false,
});

(async function() {

    const { connection } = await mongoose.connect(`mongodb://mongo:${dbPort}/${dbName}`, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useCreateIndex: true
    });

    initMailQueue(connection.db);

    // Middleware
    app.use(compression());
    app.use(session({
        name: sessionCookieName,
        secret: cookieSecret,
        resave: false,
        saveUninitialized: false,
        proxy: true,
        store: sessionStore.create({
            client: connection.getClient(),
            stringify: false,
            touchAfter: 60*60*24
        }),
        cookie: {
            sameSite: 'lax',
            maxAge: 1000*60*60*24*14,
            // TODO: Add secure in production
        },
    }));
    app.use(cookieParser(cookieSecret));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(i18n.init);
    app.use(authenticate);
    app.use(flash);

    app.use((req, res, next) => {
        const { query, body } = req;

        res.locals = {
            ...res.locals,
            query,
            querystring: Url.format({ query }),
            body
        }

        next();
    });

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

})();

export default app;
