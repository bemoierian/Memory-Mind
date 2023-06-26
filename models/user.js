const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  usedStorage: {
    type: Number,
    default: 0
  },
  storageLimit: {
    type: Number,
    default: 25.0
  },
  profilePictureURL: {
    type: String,
  },
  profilePictureRef: {
    type: String,
  },
  media: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Media'
    }
  ],
  signUpCode: {
    type: String,
    required: true
  },
  signUpCodeExpiration: {
    type: Date,
    required: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
});

module.exports = mongoose.model('User', userSchema);
