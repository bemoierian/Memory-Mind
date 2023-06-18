const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    title: {
      type: String,
      // required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    refPath: {
      type: String,
      required: true
    },
    content: {
      type: String,
      // required: true
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    reminderDate: {
      type: Date,
      // required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Media', postSchema);
