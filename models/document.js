const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentSchema = new Schema({
  title: {type: String, required: true},
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  StaffName: { type: String, required: true},
  fileSize: { type: String},
  filePath: {type: String, required: true},
  status: {type: String, enum: ['pending','prepared','signed','rejected'],default: 'pending'},
  qrCodePosition: {
    x: {type: Number, default: null},
    y: {type: Number, default: null},
    preset: {
      type: String,
      enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'custom', null],
      default: null
    }
  },
  qrPages: {
    type: String,
    enum: ['all', 'first', 'last', 'specific'],
    default: 'all'
  },
  specificPages: {
    type: String,
    default: ''
  },
  originalHash: {
    type: String,
    default: null
  },
  signedHash: {
    type: String,
    default: null
  },
  qrContent: {
    type: String,
    default: null
  },
  qrSignatureInfo: {
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    signedAt: {
      type: Date,
      default: null
    },
    signatureHash: { type: String },
    publicKey: {
      type: String,
      default: null
    },
    qrContent: {
      type: String,
      default: null
    },
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // expiresAt: {
  //   type: Date,
  //   default: function() {
  //     // Par défaut, expiration après 30 jours
  //     const date = new Date();
  //     date.setDate(date.getDate() + 30);
  //     return date;
  //   }
  // },

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
  // createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
 
});

// Index pour faciliter les recherches par utilisateur
DocumentSchema.index({ uploadedBy: 1 });

// Méthode pour vérifier si le document est signé
DocumentSchema.methods.isSigned = function() {
  return this.status === 'signed';
};

module.exports = mongoose.model('Document', DocumentSchema);
