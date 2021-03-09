import x from '../../common/routes.js';

describe('Settings', () => {

    beforeEach(function() {
        cy.login(this.user);
        cy.visit(x('/settings'));
    });

    it('Updating password', function() {
        const action = x('/settings/update-password');
        const password = 'foobar';

        cy.get(`form[action="${action}"]`).within(() => {
            cy.get('input[id="update-password__new-password"]').type(password);
            cy.get('input[id="update-password__password"]').type(this.user.password);
            cy.get('button[type="submit"]').click();
        });

        cy.logout();
        cy.login({ ...this.user, password });
    });

    it('Updating e-mail', function() {
        const action = x('/settings/update-email');
        const email = 'jane.doe@protonmail.com';

        cy.get(`form[action="${action}"]`).within(() => {
            cy.get('input[id="email"]').clear().type(email);
            cy.get('input[id="update-email__password"]').type(this.user.password);
            cy.get('button[type="submit"]').click();
        });

        cy.task('getUrlFromMail', 't-email-update').then(cy.visit);

        cy.logout();
        cy.login({ ...this.user, email });
    });

    it.only('Deleting account', function() {
        const action = x('/settings/delete-account');

        cy.get(`form[action="${action}"]`).within(() => {
            cy.get('input[id="delete-account__password"]').type(this.user.password);
            cy.get('button[type="submit"]').click();
        });

        cy.getSessionCookie().should('not.exist');

        cy.login(this.user);
    });

});
