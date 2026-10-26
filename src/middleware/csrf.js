const crypto = require('crypto');

// Generate and attach CSRF token to session and cookie
const csrfInit = (req, res, next) => {
  if (req.session) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    // Set cookie accessible to client-side JS so api.js can read it and send in headers
    res.cookie('XSRF-TOKEN', req.session.csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true'
    });
  }
  next();
};

// Verify CSRF token on mutating requests (POST, PUT, PATCH, DELETE)
const csrfVerify = (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Health endpoint or specific public webhook can be exempted if needed
  if (req.path === '/api/health') {
    return next();
  }

  const tokenFromHeader = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  const tokenFromBody = req.body && req.body._csrf;
  const providedToken = tokenFromHeader || tokenFromBody;

  if (!req.session || !req.session.csrfToken || !providedToken || providedToken !== req.session.csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation failed. Please refresh the page and try again.'
    });
  }

  next();
};

module.exports = {
  csrfInit,
  csrfVerify
};
