const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const dbStore = require('../services/dbStore');

// Helper to check if Mongoose is connected
const isMongo = () => mongoose.connection.readyState === 1;

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, currency } = req.body;

    let existingUser;
    if (isMongo()) {
      existingUser = await User.findOne({ email });
    } else {
      existingUser = await dbStore.findUserByEmail(email);
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let user;
    if (isMongo()) {
      user = await User.create({
        name,
        email,
        passwordHash,
        currency: currency || 'INR'
      });
      user = user.toJSON();
    } else {
      user = await dbStore.createUser({
        name,
        email,
        passwordHash,
        currency: currency || 'INR'
      });
      user = { ...user };
      delete user.passwordHash;
    }

    // Initialize session
    req.session.userId = user._id;

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    let user;
    if (isMongo()) {
      user = await User.findOne({ email });
    } else {
      user = await dbStore.findUserByEmail(email);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Configure session duration
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
    }

    req.session.userId = user._id;

    const sanitizedUser = { ...user.toObject ? user.toObject() : user };
    delete sanitizedUser.passwordHash;
    delete sanitizedUser.__v;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: sanitizedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie('expensewise.sid');
      res.clearCookie('XSRF-TOKEN');
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
};

// PATCH /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, currency } = req.body;
    const updates = {};

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updates.name = name.trim();
    }
    if (currency && ['INR', 'USD', 'EUR', 'GBP'].includes(currency)) {
      updates.currency = currency;
    }

    let updatedUser;
    if (isMongo()) {
      updatedUser = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');
    } else {
      updatedUser = await dbStore.updateUser(req.user._id, updates);
      if (updatedUser) {
        updatedUser = { ...updatedUser };
        delete updatedUser.passwordHash;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/auth/password
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    let fullUser;
    if (isMongo()) {
      fullUser = await User.findById(req.user._id);
    } else {
      fullUser = await dbStore.findUserById(req.user._id);
    }

    if (!fullUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, fullUser.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password provided is incorrect'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    if (isMongo()) {
      fullUser.passwordHash = newHash;
      await fullUser.save();
    } else {
      await dbStore.updateUser(req.user._id, { passwordHash: newHash });
    }

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/csrf
const getCsrf = (req, res) => {
  res.status(200).json({
    success: true,
    csrfToken: req.session ? req.session.csrfToken : null
  });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  getCsrf
};
