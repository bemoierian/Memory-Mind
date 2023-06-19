const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
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
            res.status(200).json({ message: 'User fetched.', userId: user.userId, usedStorage: user.usedStorage, storageLimit: user.storageLimit, name: user.name, email: user.email });
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
    let oldProfilePicture;
    User.findById(userId)
        .then(user => {
            if (!user) {
                const error = new Error('Could not find user.');
                error.statusCode = 404;
                throw error;
            }
            oldProfilePicture = user.profilePicture;
            user.profilePicture = req.file.path;
            return user.save();
        })
        .then(result => {
            if (oldProfilePicture !== 'images/default-profile-picture.png') {
                clearImage(oldProfilePicture);
            }
            res.status(200).json({ message: 'Profile picture updated.', profilePicture: result.profilePicture });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
}