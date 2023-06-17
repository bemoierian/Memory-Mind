const express = require('express');
const { body } = require('express-validator');

const feedController = require('../controllers/feed');
const isAuth = require('../middleware/is-auth');
const multer = require('multer');

const router = express.Router();
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'video/mp4'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const upload = multer({ storage: multer.memoryStorage(), fileFilter: fileFilter });

// GET /feed/posts
router.get('/user-media', isAuth, feedController.getUserMedia);

// POST /feed/post
router.post(
  '/upload-media',
  isAuth,
  upload.single('file'),
  [
    body('reminderDate')
      .optional()
      .trim()
      .isISO8601()
    //  .withMessage('Must be a valid date')  
    //   body('title')
    //     .trim()
    //     .isLength({ min: 5 }),
    //   body('content')
    //     .trim()
    //     .isLength({ min: 5 })
  ],
  feedController.uploadMedia
);

router.get('/media/:mediaId', isAuth, feedController.getMedia);

router.patch(
  '/media/:mediaId',
  isAuth,
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 5 }),
    body('content')
      .optional()
      .trim()
      .isLength({ min: 5 })
  ],
  feedController.updateMedia
);

router.delete('/media/:mediaId', isAuth, feedController.deleteMedia);

module.exports = router;
