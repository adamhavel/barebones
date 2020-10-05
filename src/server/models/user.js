import db from 'mongoose';
import moment from 'moment';
import bcrypt from 'bcrypt';

const TRIAL_LENGTH_DAYS = 14;
const SALT_ROUNDS = 10;

const UserRoles = Object.freeze({
    Superadmin: 'superadmin',
    Admin: 'admin'
});

const userSchema = new db.Schema({
    nickname: String,
    email: { type: String, unique: true },
    roles: [{ type: String, required: true, enum: Object.values(UserRoles) }],
    isVerified: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    password: String,
    registeredAt: { type: Date, default: Date.now },
    subscription: {
        duePaymentAt: { type: Date },
        isActive: { type: Boolean, default: false },
        trialEndsAt: { type: Date, default() { return moment().add(TRIAL_LENGTH_DAYS, 'days').toDate() } },
    },
});

userSchema.pre('save', async function() {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    }
});

userSchema.methods.matchesPassword = async function(password) {
    return bcrypt.compare(password, this.password);
}

export default db.model('User', userSchema);