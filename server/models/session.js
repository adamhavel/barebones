import db from 'mongoose';

const sessionSchema = new db.Schema({
    // connect-mongo uses string instead of ObjectId
    _id: { type: String, required: true },
    expires: { type: Date, required: true },
    session: {
        cookie: { type: db.Schema.Types.Mixed },
        userId: { type: db.Schema.Types.ObjectId, required: true, ref: 'User' },
        ip: { type: String, required: true }
    }
});

sessionSchema.statics.cleanSessions = function(userId, currentSessionId) {
    return this.deleteMany({ 'session.userId': userId, _id: { $ne: currentSessionId } }).exec();
};

sessionSchema.statics.getActiveSessions = function(userId) {
    return this.find({ 'session.userId': userId }).exec();
};

export default db.model('Session', sessionSchema);