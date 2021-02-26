import db from 'mongoose';
import bcrypt from 'bcryptjs';

import { subscriptionSchema as subscription } from './subscription.js';

const SALT_ROUNDS = 10;

const UserRole = Object.freeze({
    Superadmin: 'superadmin',
    Admin: 'admin'
});

const userSchema = new db.Schema({
    email: { type: String, unique: true, required: true },
    // TODO: Use partial index: https://stackoverflow.com/questions/35755628/unique-index-in-mongodb-3-2-ignoring-null-values
    emailCandidate: { type: String },
    roles: [{ type: String, required: true, enum: Object.values(UserRole) }],
    isVerified: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    password: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, expires: '30d' },
    subscription
});

userSchema.pre('save', async function() {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    }
});

userSchema.methods.matchesPassword = async function(password) {
    return bcrypt.compare(password, this.password);
}

const User = db.model('User', userSchema);

export { User as default, UserRole };