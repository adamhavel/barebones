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
    const baseUrl = new URL(config.baseUrl);
    const stripe = stripeFactory(stripePrivateKey);

    on('task', {
        async getUrlFromLastMail(email) {
            const mailhogClient = mailhog({ host: mailHost });
            const pollLatestMail = async resolve => {
                const { html, ID: mailId } = await mailhogClient.latestTo(email);

                if (mailId) {
                    await mailhogClient.deleteMessage(mailId);
                    resolve(html);
                } else {
                    setTimeout(pollLatestMail, 100, resolve);
                }
            };

            const latestEmail = await new Promise(pollLatestMail);
            const url = new URL(
                htmlParser
                    .parse(latestEmail)
                    .querySelector('.t-cta')
                    .getAttribute('href')
            );

            url.hostname = baseUrl.hostname;
            url.port = baseUrl.port;

            return url.href;
        },
        async resetDb() {
            const { connection: db } = await mongoose.connect(`mongodb://${dbHost}:${dbPort}/${dbName}`, {
                useUnifiedTopology: true,
                useNewUrlParser: true,
                useCreateIndex: true
            });

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

            } catch(err) {
                console.log(err);
            }

            await db.close();

            return null;
        }
    });

};