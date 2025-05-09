

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
  },
  email: {
    type: String,
    required: true,
    unique: true, // email unique
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
  },
  telephone: {
    type: String,
    trim: true,
  },
  function: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  role: {
    type: String,
    enum: ['OWN', 'USER', 'ADMIN'],
    default: 'USER',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  validation:{
    type: Boolean,
    default: false,
  },
  token:{
    type:String,
    default:''
  },
  code:{
    type:String,
    default:''
  },
  status:{
    type:String,
    default:'active'
  }
});

module.exports = mongoose.model('User', UserSchema);
