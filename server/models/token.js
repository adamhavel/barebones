import crypto from 'crypto';
import db from 'mongoose';

const DAY = 24*60*60;

const tokenSchema = new db.Schema({
    userId: { type: db.Schema.Types.ObjectId, required: true, ref: 'User' },
    token: { type: String, required: true, default() { return crypto.randomBytes(16).toString('hex') } },
    createdAt: { type: Date, required: true, default: Date.now, expires: DAY }
});

export default db.model('Token', tokenSchema);