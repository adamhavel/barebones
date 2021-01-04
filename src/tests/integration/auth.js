import route from '../../common/routes.js';

describe('Authentication', () => {

    it('Registering new user', function() {
        const { email, password } = this.user;

        cy.visit(route('auth/register'));

        cy.submitCredentials(email, password);
        cy.wait(3000);
        cy.task('getUrlFromLastMail', email)
            .then(verificationUrl => cy.visit(verificationUrl));

        cy.submitCredentials(email, password);
        cy.getCookies()
            .should('have.length', 1)
            .then(([ cookie ]) => cy.isSessionCookie(cookie));

    });

    it('Logging in', function() {
        cy.visit(route('auth/login'));
        cy.submitCredentials(this.user.email, this.user.password);
        cy.getCookies()
            .should('have.length', 1)
            .then(([ cookie ]) => cy.isSessionCookie(cookie));

    });

    it('Logging out', function() {
        cy.login(this.user.email, this.user.password);
        cy.get('.t-logout').click();
        cy.getCookies().should('have.length', 0);
    });

});
