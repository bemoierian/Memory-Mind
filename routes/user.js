const express = require('express');
const { body } = require('express-validator');

const User = require('../models/user');
const userController = require('../controllers/user');
const isAuth = require('../middleware/is-auth');

const router = express.Router();
router.get('/get-user', isAuth, userController.getUser);
router.post('/update-profile-picture', isAuth, userController.updateProfilePicture);
module.exports = router;
