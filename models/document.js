const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentSchema = new Schema({
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  StaffName: { type: Schema.Types.ObjectId, ref: 'User', required: true},
  fileType: { type: String, required: true},
  content: { type: String, required: true },
  signature: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', DocumentSchema);
