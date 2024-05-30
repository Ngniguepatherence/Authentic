// write a mongodb model for admin
const mongoose = require('mongoose')

const AdminSchema = new mongoose.Schema({
    name: {type: String, require: true},
    tel: {type: String, require: true},
    email: {type: String, require:true},
    password: {type: String, require:true},
    createAt: {type:Date, default: Date.now}
});

const Admin = mongoose.model('Admins',AdminSchema);

module.exports = Admin;