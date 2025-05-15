const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentSchema = new Schema({
  title: { type: String, required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  StaffName: { type: String, required: true },
  fileSize: { type: String },
  filePath: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'prepared', 'signed', 'rejected'],
    default: 'pending'
  },
  qrCodePosition: {
    type: [
      {
        x: { type: Number, default: null },
        y: { type: Number, default: null },
        page: { type: Number, default: 1 }
      }
    ],
    default: []
  },
  qrPositionType:{
    type: String,
    enum: ['absolute', 'custom'],
    default: 'custom'
  },
  originalHash: {
    type: String,
    default: null
  },
  signedHashOriginal: {
    type: String,
    default: null
  },
  HashSigned: {
    type: String,
    default: null
  },
  signedDocument: {
    type: String,
    default: null
  },
  qrContent: {
    type: String,
    default: null
  },
  qrSignatureInfo: {
    signedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    signedAt: {
      type: Date,
      default: null
    },
    signatureHash: {
      type: String,
      default: null
    },
    publicKey: {
      type: String,
      default: null
    },
    qrInnerContent: { // renommé pour éviter doublon avec qrContent
      type: String,
      default: null
    }
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  rejection: {
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    rejectedAt: Date
  },
  history: [
    {
      action: String, // "uploaded", "prepared", "signed", "rejected"
      actor: { type: Schema.Types.ObjectId, ref: 'User' },
      timestamp: { type: Date, default: Date.now },
      comment: String
    }
  ]
});

// Index
DocumentSchema.index({ uploadedBy: 1 });

// Méthode pour vérifier si le document est signé
DocumentSchema.methods.isSigned = function () {
  return this.status === 'signed';
};

module.exports = mongoose.model('Document', DocumentSchema);
