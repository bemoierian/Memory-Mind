const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const JWT_SECRET = process.env.JWT_SECRET;
const crypto = require('crypto');
// ----------------Mail-----------------
const { sgMail } = require('../config/sendgrid-config');

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;

  // generate random code for sign up to verify email
  const signUpCode = crypto.randomBytes(4).toString('hex');
  console.log(signUpCode);


  bcrypt
    .hash(password, 12)
    .then(hashedPw => {
      const user = new User({
        email: email,
        password: hashedPw,
        name: name,
        signUpCode: signUpCode,
        signUpCodeExpiration: Date.now() + 3600000
      });
      return user.save();
    })
    .then(result => {
      sgMail.send({
        to: result.email, // Change to your recipient
        from: 'bemoierian@outlook.com', // Change to your verified sender
        subject: 'Memory Mind - Sign Up Code',
        html: `<h1>Welcome to Memory Mind!</h1>
              <p>Sign Up code: ${result.signUpCode}</p>
              <p>Sign Up code expiration: ${result.signUpCodeExpiration}</p>`,
      });
      res.status(201).json({ message: 'User created!', userId: result._id });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  // const signUpCode = crypto.randomBytes(4).toString('hex');
  // console.log(signUpCode);
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        const error = new Error('A user with this email could not be found.');
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then(isEqual => {
      if (!isEqual) {
        const error = new Error('Wrong password!');
        error.statusCode = 401;
        throw error;
      }
      if (loadedUser.isEmailVerified === false) {
        return res.status(200).json({ userId: loadedUser._id.toString(), message: 'Please verify your email address.', isEmailVerified: loadedUser.isEmailVerified });
      }
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString()
        },
        JWT_SECRET,
        // { expiresIn: '1h' }
      );
      res.status(200).json({ message: 'Logged in successfully.', token: token, userId: loadedUser._id.toString(), usedStorage: loadedUser.usedStorage, storageLimit: loadedUser.storageLimit, name: loadedUser.name, profilePictureURL: loadedUser.profilePictureURL, isEmailVerified: loadedUser.isEmailVerified });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.verifyEmail = (req, res, next) => {
  const userId = req.body.userId;
  const signUpCode = req.body.signUpCode;
  // console.log(signUpCode);
  User.findOne({ _id: userId })
    .then(user => {
      if (!user) {
        const error = new Error('A user with this ID could not be found.');
        error.statusCode = 401;
        throw error;
      }
      if (signUpCode !== user.signUpCode) {
        const error = new Error('Wrong sign up code!');
        error.statusCode = 401;
        throw error;
      }
      if (Date.now() > user.signUpCodeExpiration) {
        const error = new Error('Sign up code expired!');
        error.statusCode = 401;
        throw error;
      }
      if (user.isEmailVerified) {
        const error = new Error('User already verified!');
        error.statusCode = 401;
        throw error;
      }
      user.isEmailVerified = true;
      return user.save();
    })
    .then(result => {
      const token = jwt.sign(
        {
          email: result.email,
          userId: result._id.toString()
        },
        JWT_SECRET,
        // { expiresIn: '1h' }
      );
      res.status(200).json({ message: 'User verified successfully.', token: token, userId: result._id.toString(), usedStorage: result.usedStorage, storageLimit: result.storageLimit, name: result.name, profilePictureURL: result.profilePictureURL, isEmailVerified: result.isEmailVerified });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
exports.resendSignUpCode = (req, res, next) => {
  const userId = req.body.userId;


  // console.log(signUpCode);
  User.findOne({ _id: userId })
    .then(user => {
      if (!user) {
        const error = new Error('A user with this ID could not be found.');
        error.statusCode = 401;
        throw error;
      }
      if (user.isEmailVerified) {
        const error = new Error('User already verified!');
        error.statusCode = 401;
        throw error;
      }
      // generate random code for sign up to verify email
      const signUpCode = crypto.randomBytes(4).toString('hex');
      console.log(signUpCode);
      user.signUpCode = signUpCode;
      user.signUpCodeExpiration = Date.now() + 3600000;
      return user.save();
    })
    .then(result => {
      sgMail.send({
        to: result.email, // Change to your recipient
        from: 'bemoierian@outlook.com', // Change to your verified sender
        subject: 'Memory Mind - Sign Up Code',
        html: `<h1>Welcome to Memory Mind!</h1>
              <p>Sign Up code: ${result.signUpCode}</p>
              <p>Sign Up code expiration: ${result.signUpCodeExpiration}</p>`,
      });
      res.status(200).json({ message: 'Sign up code sent!', userId: result._id.toString(), isEmailVerified: result.isEmailVerified, signUpCodeExpiration: result.signUpCodeExpiration });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

