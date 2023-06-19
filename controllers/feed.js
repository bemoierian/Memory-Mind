const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
// --------------Firebase----------------
const { firebase } = require('../config/firebase-config');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');
const defaultStorage = getStorage(firebase);
// ---------------Models----------------
const Media = require('../models/media');
const User = require('../models/user');



exports.getUserMedia = (req, res, next) => {
  const currentPage = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.items) || 5;
  let totalItems;
  let userId = req.userId;
  let usedStorage;
  User.findById(userId).then(user => {
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }
    usedStorage = user.usedStorage;
    return Media.find({ creator: userId }).countDocuments();
  })
    .then(count => {
      totalItems = count;
      return Media.find({ creator: userId })
        .sort({ createdAt: -1 })
        .select('-refPath')
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then(media => {
      res.status(200).json({
        message: 'Fetched media successfully.',
        media: media,
        usedStorage: usedStorage,
        totalItems: totalItems
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.uploadMedia = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    console.log(errors.array());
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error('No image provided.');
    error.statusCode = 422;
    throw error;
  }
  const file = req.file;
  // Get file size in MB
  const fileSize = file.size / (1024 * 1024);
  // -----------Firebase Variables-----------
  const refPath = `files/${new Date().toISOString() + "-" + file.originalname}`;
  const storageRef = ref(defaultStorage, refPath);
  const metaData = { contentType: file.mimetype };
  // -----------------------------------------
  let creator;
  User
    .findById(req.userId)
    .then(user => {
      creator = user;
      // Check if user has enough storage space
      if (user.usedStorage + fileSize > user.storageLimit) {
        const error = new Error('Not enough storage space.');
        error.statusCode = 422;
        throw error;
      }
      // Upload file and metadata
      return uploadBytes(storageRef, file.buffer, metaData);
    })
    .then((snapshot) => {
      // Get the download URL
      return getDownloadURL(snapshot.ref);
    })
    .then((url) => {
      // save to database
      // const title = req.body.title;
      const title = file.originalname;
      const content = req.body.content;
      const reminderDate = req.body.reminderDate;
      let media = new Media({
        title: title,
        content: content,
        fileUrl: url,
        refPath: refPath,
        fileType: metaData.contentType,
        creator: req.userId,
        fileSize: fileSize
      });
      if (reminderDate) {
        media.reminderDate = new Date(reminderDate);
      }
      // exclude refPath from media object
      // restmedia is the media object without refPath,
      // which is not needed in the response
      const { refPath: _, ...resMedia } = media._doc;
      // ------------save media to database------------
      media
        .save()
        .then(result => {
          // find the user that created the media
          resMedia.createdAt = result.createdAt;
          resMedia.updatedAt = result.updatedAt;
          // add media to user's medias array
          creator.media.push(media);
          creator.usedStorage += fileSize;
          return creator.save();
        })
        .then(result => {
          res.status(201).json({
            message: 'Media created successfully!',
            media: [resMedia],
            creator: { _id: creator._id, name: creator.name },
            usedStorage: result.usedStorage
          });
        })
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getMedia = (req, res, next) => {
  const mediaId = req.params.mediaId;
  Media.findById(mediaId)
    .then(media => {
      if (!media) {
        const error = new Error('Could not find the file.');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ message: 'Media fetched.', media: media });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updateMedia = (req, res, next) => {
  const mediaId = req.params.mediaId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  const reminderDate = req.body.reminderDate;

  Media.findById(mediaId)
    .then(media => {
      if (!media) {
        const error = new Error('Could not find file.');
        error.statusCode = 404;
        throw error;
      }
      if (media.creator.toString() !== req.userId) {
        const error = new Error('Not authorized!');
        error.statusCode = 403;
        throw error;
      }
      // update fields that are sent in the request
      if (title) {
        media.title = title;
      }
      if (content) {
        media.content = content;
      }
      if (reminderDate) {
        media.reminderDate = new Date(reminderDate);
        console.log(media.reminderDate);
      }
      console.log(reminderDate);

      return media.save();
    })
    .then(result => {
      res.status(200).json({ message: 'Media updated!', media: result });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deleteMedia = (req, res, next) => {
  const mediaId = req.params.mediaId;
  let fileSize;
  Media.findById(mediaId)
    .then(media => {
      if (!media) {
        const error = new Error('Could not find file.');
        error.statusCode = 404;
        throw error;
      }
      // Check logged in user
      if (media.creator.toString() !== req.userId) {
        const error = new Error('Not authorized!');
        error.statusCode = 403;
        throw error;
      }
      fileSize = media.fileSize;
      // deleteImageFromLocalStorage(media.imageUrl);
      return deleteImageFromFirebaseStorage(media.refPath);
    })
    .then(result => {
      // Delete media from media collection
      return Media.findByIdAndRemove(mediaId);
    })
    .then(result => {
      return User.findById(req.userId);
    })
    .then(user => {
      // Delete file from user's media array
      user.media.pull(mediaId);
      user.usedStorage -= fileSize;
      return user.save();
    })
    .then(result => {
      res.status(200).json({ message: 'Deleted file.', usedStorage: result.usedStorage });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

const deleteImageFromLocalStorage = (filePath) => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.log(err));
};

const deleteImageFromFirebaseStorage = (refPath) => {
  const storageRef = ref(defaultStorage, refPath);
  return deleteObject(storageRef);
};
