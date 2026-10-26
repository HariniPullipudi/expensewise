const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(`[Server Error] [${req.method} ${req.originalUrl}]:`, err.message || err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages
    });
  }

  // Duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    let message = `A record with this ${field} already exists.`;
    if (field === 'email') {
      message = 'An account with this email address already exists.';
    } else if (err.keyPattern && err.keyPattern.category && err.keyPattern.month && err.keyPattern.year) {
      message = 'A budget for this category and month/year already exists. Please edit the existing budget instead.';
    }
    return res.status(409).json({
      success: false,
      message
    });
  }

  // Mongoose CastError (e.g. bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for parameter: ${err.path}`
    });
  }

  // JSON parsing error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload provided in request'
    });
  }

  // Rate limiting error
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: err.message || 'Too many requests. Please try again later.'
    });
  }

  // Fallback 500 internal server error
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'An unexpected internal server error occurred.' : err.message,
    ...(isDev && { errorDetails: err.message })
  });
};

module.exports = errorHandler;
