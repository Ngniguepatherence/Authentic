const mongoose = require('mongoose')

const institutionSchema = new mongoose.Schema({
    name: {type: String, require: true},
    address: {type: String, require:true},
    boitepostal: {type: String, require: true},
    tel: {type: String, require: true},
    email: {type: String, require:true},
    headerName: {type: String, require: true},
    website: {type: String, require: true},
    publicKey: { type: String, required: true },
    privateKey: { type: String, required: true },
    password: {type: String, require:true},
    createAt: {type:Date, default: Date.now},
    firstCon:{type:Boolean,default:true}
});

const Institution = mongoose.model('Institution',institutionSchema);

module.exports = Institution;