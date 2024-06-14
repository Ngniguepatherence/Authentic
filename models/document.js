const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentSchema = new Schema({
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  StaffName: { type: String, required: true},
  fileType: { type: String, required: true},
  filePath: {type: String, required: true},
  hash: { type: String, required: true },
  signature: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  location: { type: String, required: true }, 
  title: { type: String, required: true }, 
 

});

module.exports = mongoose.model('Document', DocumentSchema);
