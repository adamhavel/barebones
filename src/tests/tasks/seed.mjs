console.log(process.env);

// import db from 'mongoose';

// const dbPort = Cypress.env('MONGO_PORT');
// const dbName = Cypress.env('MONGO_DB');

// export default function(on, config) {
//     on('task', {
//         'db:seed': async function() {
//             await db.connect(`mongodb://mongo:${dbPort}/${dbName}`, {
//                 useUnifiedTopology: true,
//                 useNewUrlParser: true,
//                 useCreateIndex: true
//             });

//             return true;
//         },
//     });
// };