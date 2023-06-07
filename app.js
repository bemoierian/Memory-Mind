require('dotenv').config();
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const MONGODB_URI = process.env.MONGODB_URI;

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');
const app = express();

// const fileStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'images');
//   },
//   filename: (req, file, cb) => {
//     cb(null, new Date().toISOString() + '-' + file.originalname);
//   }
// });

// const fileFilter = (req, file, cb) => {
//   if (
//     file.mimetype === 'image/png' ||
//     file.mimetype === 'image/jpg' ||
//     file.mimetype === 'image/jpeg'
//   ) {
//     cb(null, true);
//   } else {
//     cb(null, false);
//   }
// };

// parse json data
app.use(bodyParser.json()); // application/json
// multer for file upload
// app.use(
//   multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
// );
// serve static files
// app.use('/images', express.static(path.join(__dirname, 'images')));

// CORS support
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// routes
app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

// error handling middleware
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    MONGODB_URI
  )
  .then(result => {
    console.log('Connected to MongoDB');
    app.listen(8080);
    console.log('Server listening on port 8080');
  })
  .catch(err => console.log(err));
