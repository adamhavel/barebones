import express from 'express';
import prometheus from 'prom-client';
import responseTime from 'response-time';

import * as metrics from '../services/metrics.js';

const {
    NODE_ENV: env,
    SERVERNAME: servername
} = process.env;

const router = express.Router();

router.all('/ping', (req, res) => {
    res.send('pong');
});

router.all('/metrics', async (req, res, next) => {
    // Allow entry only for requests from internal network.
    if (env === 'production' && req.hostname === servername) return next();

    res.set('Content-Type', prometheus.contentType);
    res.send(await prometheus.register.metrics());
});

router.use(responseTime((req, res, time) => {
    const { method, path } = req;
    const { statusCode } = res;

    metrics.requests.observe({ method, path, statusCode }, time);
}));

export default router;