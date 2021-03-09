import './commands.js';

before(function() {
    cy.fixture('user').then(user => {
        this.user = user;
    });
});

beforeEach(function() {
    cy.task('purgeMail');
    cy.task('purgeStripe');
    cy.task('resetDb');
});