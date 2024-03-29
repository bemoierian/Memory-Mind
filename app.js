require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");
const MONGODB_URI = process.env.MONGODB_URI;

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const app = express();

// parse json data
app.use(bodyParser.json()); // application/json

// CORS support
app.use(cors());
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader(
//     'Access-Control-Allow-Methods',
//     'OPTIONS, GET, POST, PUT, PATCH, DELETE'
//   );
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   next();
// });

// ------------------Swagger------------------
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Memory Mind API",
      version: "1.0.0",
      description: "API-Documentation",
    },
  },
  apis: ["./routes/*.js"],
};
const specs = swaggerJsDoc(options);
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

// ------------------Routes-------------------
app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// ------------------Error Handling-------------------
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
