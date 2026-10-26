const mongoose = require('mongoose');

// Helper to validate MongoDB ObjectId in route parameters
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid identifier provided: '${id}'. Must be a valid 24-character hexadecimal ID.`
      });
    }
    next();
  };
};

// Validate transaction input
const validateTransactionInput = (req, res, next) => {
  const { title, type, amount, category, date } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push('Transaction title is required');
  } else if (title.trim().length > 100) {
    errors.push('Title cannot exceed 100 characters');
  }

  if (!type || !['income', 'expense'].includes(type.toLowerCase())) {
    errors.push("Transaction type must be either 'income' or 'expense'");
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    errors.push('Amount must be a positive number greater than 0');
  }

  if (!category || typeof category !== 'string' || !category.trim()) {
    errors.push('Category is required');
  }

  if (date) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Invalid transaction date provided');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Normalize parsed values
  req.body.title = title.trim();
  req.body.type = type.toLowerCase();
  req.body.amount = Math.round(numAmount * 100) / 100; // Round to 2 decimal places
  req.body.category = category.trim();
  req.body.date = date ? new Date(date) : new Date();

  next();
};

// Validate budget input
const validateBudgetInput = (req, res, next) => {
  const { category, amount, month, year } = req.body;
  const errors = [];

  if (!category || typeof category !== 'string' || !category.trim()) {
    errors.push('Category is required');
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    errors.push('Monthly budget limit must be a positive number greater than 0');
  }

  const numMonth = parseInt(month, 10);
  if (isNaN(numMonth) || numMonth < 1 || numMonth > 12) {
    errors.push('Month must be an integer between 1 and 12');
  }

  const numYear = parseInt(year, 10);
  if (isNaN(numYear) || numYear < 2000 || numYear > 2100) {
    errors.push('Year must be a valid 4-digit year (between 2000 and 2100)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  req.body.category = category.trim();
  req.body.amount = Math.round(numAmount * 100) / 100;
  req.body.month = numMonth;
  req.body.year = numYear;

  next();
};

// Validate registration input
const validateRegistrationInput = (req, res, next) => {
  const { name, email, password, confirmPassword } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Full name is required and must be at least 2 characters');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Registration validation failed',
      errors
    });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

// Validate login input
const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Both email and password are required'
    });
  }
  req.body.email = email.trim().toLowerCase();
  next();
};

module.exports = {
  validateObjectId,
  validateTransactionInput,
  validateBudgetInput,
  validateRegistrationInput,
  validateLoginInput
};
