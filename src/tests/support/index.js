before(function() {

    cy.exec('node src/tests/tasks/seed.mjs', { env: {
        MONGO_DB: 'barebones-test',
        MONGO_PORT: 27017,
        MONGO_HOST: 'localhost'
    }});

    cy.fixture('user').then(user => {
        this.user = user;
    });

});