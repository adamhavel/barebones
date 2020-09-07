import express from 'express';
import session from 'express-session';
import sessionStoreFactory from 'connect-mongo';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import compression from 'compression';
import nunjucks from 'nunjucks';
import db from 'mongoose';
import i18n from 'i18n';
import url from 'url';

import { authenticate } from './controllers/auth.js';
import urlGenerator from './services/urlGenerator.js';
import router from './routes/router.js';
import routes from './config/routes.js';


// Environment
const {
    NODE_PORT: port,
    NODE_SESSION_COOKIE: sessionCookieName,
    NODE_COOKIE_SECRET: cookieSecret,
    NODE_ENV: env,
    MONGO_PORT: dbPort,
    MONGO_DB: dbName,
    SERVERNAME: servername
} = process.env;


// App setup
const app = express();
const SessionStore = sessionStoreFactory(session);

app.set('trust proxy', true);
app.set('view engine', 'html');
app.set('x-powered-by', false);

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port} in ${env} mode.`)
});


// Templating
const templateDir = 'server/views';
const templateOptions = {
    autoescape: true,
    express: app,
    noCache: true,
};
const templateEnv = nunjucks.configure(templateDir, templateOptions);

templateEnv.addGlobal('routes', routes);


// I18N
i18n.configure({
    directory: 'server/locales',
    defaultLocale: 'cs',
    objectNotation: true,
    updateFiles: false,
});


// Database
const dbUrl = `mongodb://mongo:${dbPort}/${dbName}`;
const dbOptions = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
};


db.connect(dbUrl, dbOptions).then(db => {

    // Middleware
    app.use(compression());
    app.use(session({
        name: sessionCookieName,
        secret: cookieSecret,
        resave: false,
        saveUninitialized: false,
        proxy: true,
        store: new SessionStore({
            mongooseConnection: db.connection,
            stringify: false,
            touchAfter: 24 * 3600
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
    app.use(urlGenerator(servername));
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

});

export default app;
