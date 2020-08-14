import express from 'express';
import session from 'express-session';
import sessionStoreFactory from 'connect-mongo';
import bodyParser from 'body-parser';
import compression from 'compression';
import nunjucks from 'nunjucks';
import db from 'mongoose';
import url from 'url';

import { authenticate } from './controllers/auth.js';
import urlGenerator from './services/urlGenerator.js';
import router from './routes/router.js';
import routes from './config/routes.js';


// Environment
const {
    NODE_PORT: port,
    NODE_COOKIE_SECRET: cookieSecret,
    NODE_SESSION_SECRET: sessionSecret,
    NODE_ENV: env,
    MONGO_PORT: dbPort,
    MONGO_DB: dbName,
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
        name: 'stamp',
        secret: cookieSecret,
        resave: false,
        saveUninitialized: false,
        store: new SessionStore({
            mongooseConnection: db.connection,
            secret: sessionSecret,
        }),
        cookie: {
            sameSite: 'lax',
            maxAge: 1000*60*60*24*14,
            // TODO: Add secure
        },
    }));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(authenticate);
    app.use(urlGenerator);
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
