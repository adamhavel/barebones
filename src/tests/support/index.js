beforeEach(() => {
    cy.exec('node src/tests/tasks/seed.js', { env: {
        MONGO_DB: Cypress.env('MONGO_DB'),
        MONGO_PORT: Cypress.env('MONGO_PORT')
    }}).then(result => {
        cy.log(result.stdout);
    });
});