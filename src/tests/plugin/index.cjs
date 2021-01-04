const mailhog = require('mailhog');
const mongoose = require('mongoose');
const htmlParser = require('node-html-parser');

module.exports = (on, config) => {
    const {
        MONGO_HOST: dbHost,
        MONGO_PORT: dbPort,
        MONGO_DB: dbName,
        MAIL_HOST: mailHost
     } = config.env;

    on('task', {
        async getUrlFromLastMail(email) {
            const mailhogClient = mailhog({ host: mailHost });
            const { html, ID } = await mailhogClient.latestTo(email);
            const url = htmlParser
                .parse(html)
                .querySelector('.t-cta')
                .getAttribute('href');

            await mailhogClient.deleteMessage(ID);

            return url;
        },
        async resetDb() {
            const { connection } = await mongoose.connect(`mongodb://${dbHost}:${dbPort}/${dbName}`, {
                useUnifiedTopology: true,
                useNewUrlParser: true,
                useCreateIndex: true
            });

            try {
                await connection.dropCollection('users');
                await connection.dropCollection('sessions');
            } catch(err) {}

            await connection.close();

            return null;
        }
    });

};