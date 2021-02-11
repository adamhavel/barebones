import route from '../../common/routes.js';

Cypress.Commands.add('login', (email, password) => {
    cy.request({
        method: 'POST',
        url: route('auth/login'),
        body: { email, password },
        form: true
    });
});

Cypress.Commands.add('submitCredentials', (email, password) => {
    cy.get('form[type="auth"]').within(() => {
        if (email) cy.get('input[name="email"]').clear().type(email);
        if (password) cy.get('input[name="password"]').clear().type(password);
        cy.get('button[type="submit"]').click();
    })
});

Cypress.Commands.add('getSessionCookie', () => {
    return cy.getCookie(Cypress.env('NODE_SESSION_COOKIE'));
});