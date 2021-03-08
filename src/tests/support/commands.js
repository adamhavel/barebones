import x from '../../common/routes.js';
import Url from 'url';

Cypress.Commands.add('login', ({ email, password }) => {
    return cy.request({
        method: 'POST',
        url: x('/auth/login'),
        body: { email, password },
        form: true
    });
});

Cypress.Commands.add('logout', () => {
    return cy.request({
        method: 'GET',
        url: x('/auth/logout')
    });
});

Cypress.Commands.add('register', ({ email, password }) => {
    cy.request({
        method: 'POST',
        url: x('/auth/register'),
        body: { email, password },
        form: true
    });

    return cy.task('getUrlFromMail', 't-account-verification').then(url => {
        cy.request({
            method: 'POST',
            url,
            body: { email, password },
            form: true
        });
    });
});

Cypress.Commands.add('submitCredentials', ({ email, password }) => {
    return cy.get('form[type="auth"]').within(() => {
        if (email) cy.get('input[name="email"]').clear().type(email);
        if (password) cy.get('input[name="password"]').clear().type(password);
        cy.get('button[type="submit"]').click();
    })
});

Cypress.Commands.add('getSessionCookie', () => {
    return cy.getCookie(Cypress.env('NODE_SESSION_COOKIE'));
});