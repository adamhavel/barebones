import db from 'mongoose';
import bcrypt from 'bcryptjs';

import { subscriptionSchema as subscription } from './subscription.js';

const SALT_ROUNDS = 10;
const DATA_RETENTION_DAYS = 30;

const UserRole = Object.freeze({
    Superadmin: 'superadmin',
    Admin: 'admin'
});

const userSchema = new db.Schema({
    nickname: String,
    email: { type: String, unique: true },
    roles: [{ type: String, required: true, enum: Object.values(UserRole) }],
    isVerified: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    password: String,
    registeredAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, index: { expires: DATA_RETENTION_DAYS + 'd' }},
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