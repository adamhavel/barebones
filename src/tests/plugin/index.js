import mailhog from 'mailhog';
import mongoose from 'mongoose';
import htmlParser from 'node-html-parser';
import stripeFactory from 'stripe';

import User from '../../server/models/user.js';

export default async (on, config) => {
    const {
        MONGO_HOST: dbHost,
        MONGO_PORT: dbPort,
        MONGO_DB: dbName,
        MAIL_HOST: mailHost,
        STRIPE_PRIVATE_KEY: stripePrivateKey
    } = config.env;
    const { connection: db } = await mongoose.connect(`mongodb://${dbHost}:${dbPort}/${dbName}`, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useCreateIndex: true
    });
    const mailhogClient = mailhog({ host: mailHost });
    const baseUrl = new URL(config.baseUrl);
    const stripe = stripeFactory(stripePrivateKey);

    on('task', {
        async purgeMail() {
            await mailhogClient.deleteAll();

            return null;
        },
        async getUrlFromMail(subject) {
            const pollMail = async resolve => {
                const { html } = await mailhogClient.latestContaining(subject);

                if (html) {
                    resolve(html);
                } else {
                    setTimeout(pollMail, 100, resolve);
                }
            };

            const mail = await new Promise(pollMail);
            const url = new URL(
                htmlParser
                    .parse(mail)
                    .querySelector('.' + subject)
                    .getAttribute('href')
            );

            url.hostname = baseUrl.hostname;
            url.port = baseUrl.port;

            return url.href;
        },
        async resetDb() {
            try {
                const users = await User.find();

                users.forEach(async user => {
                    const { stripeCustomerId } = user.subscription || {};

                    if (stripeCustomerId) {
                        await stripe.customers.del(stripeCustomerId);
                    }
                });

                await db.dropCollection('users');
                await db.dropCollection('tokens');
                await db.dropCollection('sessions');

            } catch(err) {}

            return null;
        }
    });

};