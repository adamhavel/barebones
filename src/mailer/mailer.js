import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import MailTime from 'mail-time';

const {
    NODE_ENV: env,
    MONGO_PORT: dbPort,
    MONGO_DB: dbName,
    MAIL_SMTP_PORT: port,
    MAIL_USER: user,
    MAIL_PASSWORD: pass
} = process.env;

if (user && pass) {

}

const transport = nodemailer.createTransport({
    host: 'mailhog', port
});

(async function() {

    const { connection } = await mongoose.connect(`mongodb://mongo:${dbPort}/${dbName}`, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useCreateIndex: true
    });

    const mailQueue = new MailTime({
        db: connection.db,
        type: 'server',
        transports: [transport]
    });

})();