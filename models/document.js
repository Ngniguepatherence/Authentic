const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentSchema = new Schema({
  title: {type: String, required: true},
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  StaffName: { type: String, required: true},
  fileType: { type: String, required: true},
  filePath: {type: String, required: true},
  status: {type: String, enum: ['pending','prepared','signed','rejected'],default: 'pending'},
  qrCodePosition: {
    x: Number,
    y: Number,
    page: Number
  },
  hash: { type: String, required: true },
  signature: { 
    signedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    signedAt: Date,
    signatureHash: String,
    publicKey: String  
  },
  rejection: {
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    rejectedAt: Date
  },
  history: [
    {
      action: String, // ex: "uploaded", "prepared", "signed", "rejected"
      actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      timestamp: { type: Date, default: Date.now },
      comment: String
    }
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
 
});

module.exports = mongoose.model('Document', DocumentSchema);
