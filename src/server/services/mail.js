import nodemailer from 'nodemailer';
import MailTime from 'mail-time';
import { getEmailVerificationUrl, getPasswordResetUrl } from './urlGenerator.js';

let mailQueue;

export function initMailQueue(db) {
    mailQueue = new MailTime({ db, type: 'client' });
}

export function sendRegistrationEmail(email, token) {
    const verificationUrl = getEmailVerificationUrl(token);

    mailQueue.sendMail({
        from: '"Fred Foo 👻" <foo@example.com>',
        to: email,
        subject: 'Verify your account',
        text: `Open ${verificationUrl} to verify.`,
        html: `Open <a href="${verificationUrl}">${verificationUrl}</a> to verify.`
    });
}

export function sendPasswordResetEmail(email, token) {
    const verificationUrl = getPasswordResetUrl(token);

    mailQueue.sendMail({
        from: '"Fred Foo 👻" <foo@example.com>',
        to: email,
        subject: 'Reset password',
        text: `Open ${verificationUrl} to verify.`,
        html: `Open <a href="${verificationUrl}">${verificationUrl}</a> to verify.`
    });
}