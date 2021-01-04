import './commands.js';

before(function() {

    cy.task('resetDb');

    cy.fixture('user').then(user => {
        this.user = user;
    });

});