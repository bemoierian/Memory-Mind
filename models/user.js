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
  media: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Media'
    }
  ]
});

module.exports = mongoose.model('User', userSchema);
