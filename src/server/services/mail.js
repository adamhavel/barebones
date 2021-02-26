import nodemailer from 'nodemailer';
import MailTime from 'mail-time';
import striptags from 'striptags';
import * as urlGenerator from './urlGenerator.js';

const {
    MAIL_ADDRESS: mailAddress
} = process.env;

let mailQueue;

export function initMailQueue(db) {
    mailQueue = new MailTime({ db, type: 'client' });
}

function sendMail(to, subject, html) {
    mailQueue.sendMail({
        from: `AcmeCo <${mailAddress}>`,
        to,
        subject,
        text: striptags(html),
        html
    });
}

export function sendRegistrationEmail(email, token) {
    sendMail(
        email,
        i18n.__('auth.login.mail.subject'),
        i18n.__('auth.login.mail.html', { url: urlGenerator.getEmailVerificationUrl(token) })
    );
}

export function sendPasswordResetEmail(email, token) {
    sendMail(
        email,
        i18n.__('auth.forgot.mail.subject'),
        i18n.__('auth.forgot.mail.html', { url: urlGenerator.getPasswordResetUrl(token) })
    );
}

export function sendEmailAddressUpdateEmails(oldEmail, newEmail, token) {
    const verificationUrl = urlGenerator.getEmailAddressUpdateUrl(token);

    sendMail(oldEmail, 'E-mail has been updated', 'Your e-mail address has been updated.');
    sendMail(newEmail, 'Update e-mail', `Open <a class="t-cta" href="${verificationUrl}">${verificationUrl}</a> to verify.`);

    sendMail(
        newEmail,
        i18n.__('settings.account.update-email.mail.subject'),
        i18n.__('settings.account.update-email.mail.html', { url: urlGenerator.getEmailAddressUpdateUrl(token) })
    );
}