import { Counter, Gauge, Summary, Histogram } from 'prom-client';

const PREFIX = 'app';

export const requests = new Summary({
    name: `${PREFIX}_requests`,
    help: 'Response time in milliseconds',
    labelNames: ['method', 'path', 'statusCode'],
    //buckets: [20, 50, 100, 200, 500, 1000, 2000, 5000]
});

