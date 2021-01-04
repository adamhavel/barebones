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
    cy.get('input[name="email"]')
        .clear()
        .type(email);

    cy.get('input[name="password"]')
        .clear()
        .type(`${password}{enter}`);
});

Cypress.Commands.add('isSessionCookie', cookie => {
    return expect(cookie).to.have.property('name', Cypress.env('NODE_SESSION_COOKIE'))
});