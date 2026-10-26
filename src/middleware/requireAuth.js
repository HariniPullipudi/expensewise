const mongoose = require('mongoose');
const User = require('../models/User');
const dbStore = require('../services/dbStore');

const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to access this resource.'
      });
    }

    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.session.userId).select('-passwordHash');
    } else {
      const stored = await dbStore.findUserById(req.session.userId);
      if (stored) {
        user = { ...stored };
        delete user.passwordHash;
      }
    }

    if (!user) {
      if (req.session) {
        req.session.destroy(() => {});
      }
      return res.status(401).json({
        success: false,
        message: 'User session invalid. Please log in again.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = requireAuth;
