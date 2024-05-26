const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
    institution: {type: mongoose.Schema.Types.ObjectId, ref: 'Institution',required: true
    },
    name: { type: String, required: true},
    email: {type: String, required: true,unique: true},
    publicKey: { type: String, required: true },
    privateKey: { type: String, required: true },
    password: {type: String, required: true},
    role: {type: String, enum: ['admin','user'], default:'user'},
    createdAt: {type: Date, default: Date.now}
});

const User = mongoose.model('User',UserSchema);
module.exports = User;