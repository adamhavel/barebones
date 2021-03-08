import x from '../../common/routes.js';

describe('Authentication', () => {

    it('Registering new user', function() {
        const newUser = { email: 'john.doe@example.com', password: 'foobar' };

        cy.visit(x('/auth/register'));
        cy.submitCredentials(newUser);

        cy.task('getUrlFromMail', 't-account-verification').then(cy.visit);

        cy.submitCredentials(newUser);
        cy.getSessionCookie().should('exist');
    });

    it('Logging in', function() {
        cy.visit(x('/auth/login'));
        cy.submitCredentials(this.user);
        cy.getSessionCookie().should('exist');
    });

    it('Logging out', function() {
        cy.login(this.user);
        cy.get('.t-logout').click();
        cy.getSessionCookie().should('not.exist');
    });

    it('Reset forgotten password', function() {
        const { email } = this.user;
        const password = 'foobar';

        cy.visit(x('/auth/reset'));
        cy.submitCredentials({ email });

        cy.task('getUrlFromMail', 't-password-reset').then(cy.visit);

        // Enter new password.
        cy.submitCredentials({ password });

        // Login with new password.
        cy.submitCredentials({ email, password });
        cy.getSessionCookie().should('exist');
    });

});
