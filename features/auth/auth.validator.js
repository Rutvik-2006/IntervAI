const AppError = require('../../utils/appError');

class AuthValidator {
  // Helper: check if a value is a string and sanitizes simple XSS tokens
  _sanitizeString(val) {
    if (typeof val !== 'string') return '';
    return val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Prevent basic MongoDB Injection (removing keys starting with $)
  _preventNoSQLInjection(body) {
    for (let key in body) {
      if (key.startsWith('$') || key.includes('.')) {
        delete body[key];
      }
    }
  }

  validateRegister = (req, res, next) => {
    this._preventNoSQLInjection(req.body);
    let { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return next(new AppError('All registration fields (email, password, firstName, lastName) are required.', 400));
    }

    // Sanitize names
    req.body.firstName = this._sanitizeString(firstName).trim();
    req.body.lastName = this._sanitizeString(lastName).trim();

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Please provide a valid email address.', 400));
    }
    req.body.email = email.toLowerCase().trim();

    // Validate password complexity (min 8 characters, at least 1 number)
    if (password.length < 8) {
      return next(new AppError('Password must be at least 8 characters long.', 400));
    }
    if (!/\d/.test(password)) {
      return next(new AppError('Password must contain at least one numeric digit.', 400));
    }

    // Validate role
    if (role && !['candidate'].includes(role)) {
      return next(new AppError('Invalid user role assigned.', 400));
    }

    next();
  };

  validateLogin = (req, res, next) => {
    this._preventNoSQLInjection(req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide both email and password.', 400));
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Please provide a valid email format.', 400));
    }

    req.body.email = email.toLowerCase().trim();
    next();
  };

  validateForgotPassword = (req, res, next) => {
    this._preventNoSQLInjection(req.body);
    const { email } = req.body;

    if (!email) {
      return next(new AppError('Please provide an email address.', 400));
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Please provide a valid email format.', 400));
    }

    req.body.email = email.toLowerCase().trim();
    next();
  };

  validateResetPassword = (req, res, next) => {
    this._preventNoSQLInjection(req.body);
    const { password } = req.body;

    if (!password) {
      return next(new AppError('Please provide a new password.', 400));
    }

    if (password.length < 8) {
      return next(new AppError('Password must be at least 8 characters long.', 400));
    }

    next();
  };

  validateUpdatePassword = (req, res, next) => {
    this._preventNoSQLInjection(req.body);
    const { currentPassword, password } = req.body;

    if (!currentPassword || !password) {
      return next(new AppError('Both currentPassword and new password are required.', 400));
    }

    if (password.length < 8) {
      return next(new AppError('New password must be at least 8 characters long.', 400));
    }

    if (!/\d/.test(password)) {
      return next(new AppError('New password must contain at least one numeric digit.', 400));
    }

    if (currentPassword === password) {
      return next(new AppError('New password cannot be the same as the current password.', 400));
    }

    next();
  };

  validateResendVerification = (req, res, next) => {
    this._preventNoSQLInjection(req.body);
    const { email } = req.body;

    if (!email) {
      return next(new AppError('Please provide an email address.', 400));
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Please provide a valid email format.', 400));
    }

    req.body.email = email.toLowerCase().trim();
    next();
  };
}

module.exports = new AuthValidator();
