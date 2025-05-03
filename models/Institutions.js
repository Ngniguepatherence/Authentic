const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const InstitutionSchema = new mongoose.Schema({
    name: String,
    website: String,
    address: String,
    email: String,
    phone: String,
    description: String,
    location: String,
    logo: {
      url: String,
      fileType: String,
      uploadedAt: Date
    },
    certificate: {
      commonName: String,
      organization: String,
      organizationalUnit: String,
      country: String,
      validFrom: Date,
      validTo: Date,
      publicKey: String,
      fingerprint: String,
      certificateRaw: String,
      verified: Boolean
    },
    status: {
      type: String,
      enum: ["pending", "validated"],
      default: "pending"
    },  
    validationToken: {
      type: String,
      default: uuidv4
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  });

const Institution = mongoose.model('Institution',InstitutionSchema);

module.exports = Institution;