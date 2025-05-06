// write a mongodb model for admin
const mongoose = require('mongoose')

const AdminSchema = new mongoose.Schema({
   institution: {type: mongoose.Schema.Types.ObjectId, ref: 'Institution',required: true
       },
       name: { type: String, required: true},
       email: {type: String, required: true,unique: true},
       telephone: {type: String, required: true},
       password: {type: String, required: true},
       role: {type: String, enum: ['admin'], default:'admin'},
       occupation: {type: String, required: true},
       createdAt: {type: Date, default: Date.now}
});

const Admin = mongoose.model('Admins',AdminSchema);

module.exports = Admin;