import { Counter, Gauge, Summary, Histogram } from 'prom-client';
import User from '../models/user.js';

const PREFIX = 'app';

export const requests = new Summary({
    name: `${PREFIX}_requests`,
    help: 'Response time in milliseconds',
    labelNames: ['method', 'path', 'statusCode'],
    //buckets: [20, 50, 100, 200, 500, 1000, 2000, 5000]
});

export const registeredUsers = new Gauge({
    name: `${PREFIX}_users_registered`,
    help: 'Number of registered users'
});

export async function initMetrics() {
    registeredUsers.set(await User.countDocuments());
};


