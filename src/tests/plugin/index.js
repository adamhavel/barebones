import mailhog from 'mailhog';
import mongoose from 'mongoose';
import htmlParser from 'node-html-parser';
import stripeFactory from 'stripe';
import moment from 'moment';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import i18n from 'i18n';

import User from '../../server/models/user.js';
import Token from '../../server/models/token.js';
import Session from '../../server/models/session.js';
import { SubscriptionStatus } from '../../server/services/stripe.js';
import { TRIAL_PERIOD_DAYS } from '../../server/models/subscription.js';

i18n.configure({
    directory: 'src/server/locales',
    defaultLocale: 'cs',
    objectNotation: true,
    updateFiles: false,
});

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
        async i18n(key) {
            return i18n.__(key);
        },
        async purgeMail() {
            await mailhogClient.deleteAll();

            return true;
        },
        async getUrlFromMail(hook) {
            const pollMail = async resolve => {
                const { html } = await mailhogClient.latestContaining(hook);

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
                    .querySelector('.' + hook)
                    .getAttribute('href')
            );

            url.hostname = baseUrl.hostname;
            url.port = baseUrl.port;

            return url.href;
        },
        async resetDb() {
            try {
                await User.deleteMany();
                await Token.deleteMany();
                await Session.deleteMany();

                const { email, password } = JSON.parse(await fs.readFile('src/tests/fixtures/user.json', 'utf8'));
                const user = await User.create({ email, password });
                const { id: customerId } = await stripe.customers.create({ email });

                user.isVerified = true;
                user.subscription = {
                    customerId,
                    status: SubscriptionStatus.Trialing,
                    endsAt: moment().add(TRIAL_PERIOD_DAYS, 'days').toDate()
                };

                await user.save();

            } catch(err) {
                console.log(err);
            }

            return true;
        },
        async purgeStripe() {
            const users = await User.find();

            users.forEach(async user => {
                const { customerId } = user.subscription || {};

                if (customerId) {
                    await stripe.customers.del(customerId);
                }
            });

            return true;
        }
    });

};