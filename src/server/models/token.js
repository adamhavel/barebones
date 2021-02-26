import crypto from 'crypto';
import db from 'mongoose';

const TokenPurpose = Object.freeze({
    EmailVerification: 'email-verification',
    PasswordReset: 'password-reset'
});

const tokenSchema = new db.Schema({
    userId: { type: db.Schema.Types.ObjectId, required: true, ref: 'User' },
    token: { type: String, required: true, default() { return crypto.randomBytes(16).toString('hex') } },
    createdAt: { type: Date, required: true, default: Date.now, expires: '1d' },
    purpose: { type: String, required: true, enum: Object.values(TokenPurpose) }
});

tokenSchema.statics.deleteAll = function(userId, purpose) {
    return this.deleteMany({ userId, purpose }).exec();
};

const Token = db.model('Token', tokenSchema);

export { Token as default, TokenPurpose };