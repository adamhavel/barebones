import mongodb from 'mongodb';

const {
    MONGO_PORT: port,
    MONGO_DB: name
} = process.env;

const url = `mongodb://mongo:${port}/${name}`;
const options = {
    useUnifiedTopology: true
};
const client = new mongodb.MongoClient(url, options);

(async function() {
    await client.connect();
})();

const db = client.db(name);

export { client, db };