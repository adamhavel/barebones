import nodemailer from 'nodemailer';

import { getEmailVerificationUrl, getPasswordResetUrl } from './urlGenerator.js';

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'dana.kautzer@ethereal.email',
        pass: 'ptcxPhFFtGGaK1SqhZ'
    }
});

export function sendRegistrationEmail(email, token) {
    const verificationUrl = getEmailVerificationUrl(token);

    return transporter.sendMail({
        from: '"Fred Foo 👻" <foo@example.com>',
        to: email,
        subject: 'Verify your account',
        text: `Open ${verificationUrl} to verify.`,
        html: `Open <a href="${verificationUrl}">${verificationUrl}</a> to verify.`
    });
}

export function sendPasswordResetEmail(email, token) {
    const verificationUrl = getPasswordResetUrl(token);

    return transporter.sendMail({
        from: '"Fred Foo 👻" <foo@example.com>',
        to: email,
        subject: 'Reset password',
        text: `Open ${verificationUrl} to verify.`,
        html: `Open <a href="${verificationUrl}">${verificationUrl}</a> to verify.`
    });
}