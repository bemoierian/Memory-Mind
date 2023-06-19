const express = require('express');
const { body } = require('express-validator');

const User = require('../models/user');
const userController = require('../controllers/user');
const isAuth = require('../middleware/is-auth');
const multer = require('multer');
const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};
const upload = multer({ storage: multer.memoryStorage(), fileFilter: fileFilter });

const router = express.Router();
router.get('/get-user', isAuth, userController.getUser);
router.post('/update-profile-picture', isAuth, upload.single('file'), userController.updateProfilePicture);
module.exports = router;
