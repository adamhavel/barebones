const route = require('../../common/routes.js');

describe('Authentication', () => {

    it('Registering new user', function() {

        const { email, password } = this.user;

        cy.visit(route('auth/register'));

        cy.get('input[name="email"]').type(email);
        cy.get('input[name="password"]').type(`${password}{enter}`);

        cy.wait(3000);
        cy.task('getLinkFromLastMail', email).then(verificationUrl => cy.visit(verificationUrl));

        cy.get('input[name="email"]').type(email);
        cy.get('input[name="password"]').type(`${password}{enter}`);

    });

});
