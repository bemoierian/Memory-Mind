const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
// --------------Firebase----------------
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBSE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBSE_APP_ID
};
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');
firebase = initializeApp(firebaseConfig);
const defaultStorage = getStorage(firebase);
// ---------------Models----------------
const Post = require('../models/post');
const User = require('../models/user');



exports.getPosts = (req, res, next) => {
  const currentPage = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.items) || 5;
  let totalItems;
  let userId = req.userId;
  Post.find({ creator: userId })
    .countDocuments()
    .then(count => {
      totalItems = count;
      return Post.find({ creator: userId })
        .select('-refPath')
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then(posts => {
      res.status(200).json({
        message: 'Fetched posts successfully.',
        posts: posts,
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

exports.createPost = (req, res, next) => {
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

  // -----------Upload to Firebase-----------
  const file = req.file;
  const refPath = `files/${new Date().toISOString() + "-" + file.originalname}`;
  const storageRef = ref(defaultStorage, refPath);
  const metaData = { contentType: file.mimetype };
  // Upload file and metadata
  uploadBytes(storageRef, file.buffer, metaData)
    .then((snapshot) => {
      // Get the download URL
      return getDownloadURL(snapshot.ref);
    })
    .then((url) => {
      // save to database
      const title = req.body.title;
      const content = req.body.content;
      let creator;
      const post = new Post({
        title: title,
        content: content,
        fileUrl: url,
        refPath: refPath,
        fileType: metaData.contentType,
        creator: req.userId
      });
      // exclude refPath from post object
      // restPost is the post object without refPath,
      // which is not needed in the response
      const { refPath: _, ...resPost } = post._doc;
      // ------------save post to database------------
      post
        .save()
        .then(result => {
          // find the user that created the post
          return User.findById(req.userId);
        })
        .then(user => {
          // add post to user's posts array
          creator = user;
          user.posts.push(post);
          return user.save();
        })
        .then(result => {
          res.status(201).json({
            message: 'Post created successfully!',
            post: resPost,
            creator: { _id: creator._id, name: creator.name }
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

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ message: 'Post fetched.', post: post });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updatePost = (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;

  Post.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not authorized!');
        error.statusCode = 403;
        throw error;
      }
      // update fields that are sent in the request
      if (title) {
        post.title = title;
      }
      if (content) {
        post.content = content;
      }

      return post.save();
    })
    .then(result => {
      res.status(200).json({ message: 'Post updated!', post: result });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      // Check logged in user
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not authorized!');
        error.statusCode = 403;
        throw error;
      }
      // deleteImageFromLocalStorage(post.imageUrl);
      return deleteImageFromFirebaseStorage(post.refPath);
    })
    .then(result => {
      // Delete post from posts collection
      return Post.findByIdAndRemove(postId);
    })
    .then(result => {
      return User.findById(req.userId);
    })
    .then(user => {
      // Delete post from user's posts array
      user.posts.pull(postId);
      return user.save();
    })
    .then(result => {
      res.status(200).json({ message: 'Deleted post.' });
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
