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


/**
 * @swagger
 * /feed/user-media:
 *  get:
 *    description: Used to get all media of a user with pagination
 *    parameters:
 *       - in: path
 *         name: page
 *         required: false
 *         description: Page number.
 *         schema:
 *           type: integer
 *       - in: path
 *         name: items
 *         required: false
 *         description: Number of items per page.
 *         schema:
 *           type: integer
 *    responses:
 *      "200":
 *        description: A successful response
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  description: Message.
 *                  example: Fetched media successfully.
 *                usedStorage:
 *                  type: number
 *                  description: Used storage space in MB.
 *                  example: 1.5
 *                totalItems:
 *                  type: number
 *                  description: Total number of media.
 *                  example: 10
 *                media:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      title:
 *                        type: string
 *                        description: Media file name.
 *                        example: photo.jpg
 *                      content:
 *                        type: string
 *                        description: Media content.
 *                        example: This is a photo of my cat.
 *                      reminderDate:
 *                        type: string
 *                        description: Media reminder date.
 *                        example: 2020-01-01T00:00:00.000Z
 *                      fileUrl:
 *                        type: string
 *                        description: Media file URL.
 *                      fileSize:
 *                        type: number
 *                        description: Media file size in MB.
 *                        example: 1.5
 *                      fileType:
 *                        type: string
 *                        description: Media file type.
 *                        example: image/jpeg
 *                      creator:                
 *                        type: object
 *                        properties:
 *                          _id:
 *                            type: string
 *                            description: User ID.
 *   
*/
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
