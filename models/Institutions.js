const mongoose = require('mongoose')

const institutionSchema = new mongoose.Schema({
    name: {type: String, require: true},
    address: {type: String, require:true},
    boitepostal: {type: String, require: true},
    tel: {type: String, require: true},
    email: {type: String, require:true},
    website: {type: String, require: true},
    responsable: {type: String, require: true},
    password: {type: String, require:true},
    createAt: {type:Date, default: Date.now}
});

const Institution = mongoose.model('Institution',institutionSchema);

module.exports = Institution;