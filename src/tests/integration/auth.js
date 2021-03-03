import x from '../../common/routes.js';

describe('Authentication', () => {

    it('Registering new user', function() {
        const { email, password } = this.user;

        cy.visit(x('/auth/register'));
        cy.submitCredentials(email, password);

        cy.task('getUrlFromLastMail', email).then(cy.visit);

        cy.submitCredentials(email, password);
        cy.getSessionCookie().should('exist');
    });

    it('Logging in', function() {
        cy.visit(x('/auth/login'));
        cy.submitCredentials(this.user.email, this.user.password);
        cy.getSessionCookie().should('exist');
    });

    it('Logging out', function() {
        cy.login(this.user.email, this.user.password);
        cy.get('.t-logout').click();
        cy.getSessionCookie().should('not.exist');
    });

    it('Reset forgotten password', function() {
        const { email, password } = this.user;
        const newPassword = 'foobar';

        cy.visit(x('/auth/reset'));
        cy.submitCredentials(email);

        cy.task('getUrlFromLastMail', email).then(cy.visit);

        // Enter new password.
        cy.submitCredentials(undefined, newPassword);

        // Login with new password.
        cy.submitCredentials(email, newPassword);
        cy.getSessionCookie().should('exist');
    });

});
