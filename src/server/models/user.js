import db from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const UserRole = Object.freeze({
    Superadmin: 'superadmin',
    Admin: 'admin'
});

const SubscriptionStatus = Object.freeze({
    Active: 'active',
    PastDue: 'past_due',
    Unpaid: 'unpaid',
    Canceled: 'canceled',
    Incomplete: 'incomplete',
    IncompleteExpired: 'incomplete_expired',
    Trialing: 'trialing'
});

const userSchema = new db.Schema({
    nickname: String,
    email: { type: String, unique: true },
    roles: [{ type: String, required: true, enum: Object.values(UserRole) }],
    isVerified: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    password: String,
    registeredAt: { type: Date, default: Date.now },
    subscription: {
        id: { type: String },
        customer: { type: String },
        status: { type: String, enum: Object.values(SubscriptionStatus) },
        startsAt: { type: Date },
        endsAt: { type: Date }
    }
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

export { User as default, SubscriptionStatus };