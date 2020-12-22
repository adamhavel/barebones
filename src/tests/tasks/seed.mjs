import mongoose from 'mongoose';

const {
    MONGO_HOST: dbHost,
    MONGO_PORT: dbPort,
    MONGO_DB: dbName
} = process.env;

(async function() {

    const { connection } = await mongoose.connect(`mongodb://${dbHost}:${dbPort}/${dbName}`, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useCreateIndex: true
    });

    try {
        await connection.dropCollection('users');
        await connection.dropCollection('sessions');
    } catch(err) {}

    await connection.close();

})();