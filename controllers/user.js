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