import i18n from 'i18n';
import nodemailer from 'nodemailer';
import MailTime from 'mail-time';
import striptags from 'striptags';
import * as urlGenerator from './urlGenerator.js';

const {
    MAIL_ADDRESS: mailAddress
} = process.env;

let mailQueue;

export function initMailQueue(db) {
    if (!mailQueue) {
        mailQueue = new MailTime({ db, type: 'client' });
    }
}

export function sendMail(email, subject, html) {
    mailQueue.sendMail({
        from: `AcmeCo <${mailAddress}>`,
        to: email,
        subject,
        text: striptags(html),
        html
    });
}

export function sendRegistrationEmail(email, token) {
    sendMail(
        email,
        i18n.__('auth.register.mail.subject'),
        i18n.__('auth.register.mail.html', { url: urlGenerator.getAccountVerificationUrl(token) })
    );
}

export function sendPasswordResetEmail(email, token) {
    sendMail(
        email,
        i18n.__('auth.reset.mail.subject'),
        i18n.__('auth.reset.mail.html', { url: urlGenerator.getPasswordResetUrl(token) })
    );
}

export function sendEmailAddressUpdateEmails(oldEmail, newEmail, token) {
    sendMail(
        oldEmail,
        i18n.__('settings.account.update-email.mail.old-address.subject'),
        i18n.__('settings.account.update-email.mail.old-address.html', { email: newEmail })
    );

    sendMail(
        newEmail,
        i18n.__('settings.account.update-email.mail.new-address.subject'),
        i18n.__('settings.account.update-email.mail.new-address.html', { url: urlGenerator.getEmailAddressUpdateUrl(token) })
    );
}