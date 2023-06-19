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

exports.getUser = (req, res, next) => {
    const userId = req.userId;
    User.findById(userId)
        .then(user => {
            if (!user) {
                const error = new Error('Could not find user.');
                error.statusCode = 404;
                throw error;
            }
            res.status(200).json({ message: 'User fetched.', userId: user.userId, usedStorage: user.usedStorage, storageLimit: user.storageLimit, name: user.name, email: user.email, profilePictureURL: user.profilePictureURL });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
};
exports.updateProfilePicture = (req, res, next) => {
    const userId = req.userId;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.');
        error.statusCode = 422;
        throw error;
    }
    if (!req.file) {
        const error = new Error('No image provided.');
        error.statusCode = 422;
        throw error;
    }
    const file = req.file;
    // -----------Firebase Variables-----------
    const refPath = `profile_pictures/${new Date().toISOString() + "-" + file.originalname}`;
    const storageRef = ref(defaultStorage, refPath);
    const metaData = { contentType: file.mimetype };
    //   ----------------------------------------
    let currUser;
    let oldProfilePictureRef;
    User.findById(userId)
        .then(user => {
            if (!user) {
                const error = new Error('Could not find user.');
                error.statusCode = 404;
                throw error;
            }
            currUser = user;
            // get old profile picture ref
            oldProfilePictureRef = user.profilePictureRef;
            // upload new profile picture to firebase storage
            return uploadBytes(storageRef, file.buffer, metaData);
        })
        .then(snapshot => {
            return getDownloadURL(snapshot.ref);
        })
        .then(url => {
            // update user profile picture
            currUser.profilePictureURL = url;
            currUser.profilePictureRef = refPath;
            return currUser.save();
        })
        .then(result => {
            // Delete old profile picture
            if (oldProfilePictureRef) {
                return deleteImageFromFirebaseStorage(oldProfilePictureRef);
            }
            return res.status(200).json({ message: 'Profile picture updated.', profilePictureURL: currUser.profilePictureURL });
        })
        .then((result) => {
            res.status(200).json({ message: 'Profile picture updated.', profilePictureURL: currUser.profilePictureURL });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
};

const deleteImageFromFirebaseStorage = (refPath) => {
    const storageRef = ref(defaultStorage, refPath);
    return deleteObject(storageRef);
};
