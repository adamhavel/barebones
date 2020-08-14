import nodemailer from 'nodemailer';
import routes from '../config/routes.js';

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'dana.kautzer@ethereal.email',
        pass: 'ptcxPhFFtGGaK1SqhZ'
    }
});

export function sendRegistrationEmail(email, verificationUrl) {
    return transporter.sendMail({
        from: '"Fred Foo 👻" <foo@example.com>',
        to: email,
        subject: 'Verify your account',
        text: `Open ${verificationUrl} to verify.`,
        html: `Open <a href="">${verificationUrl}</a> to verify.`
    });
}