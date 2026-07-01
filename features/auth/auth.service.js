const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const authRepository = require('./auth.repository');
const AppError = require('../../utils/appError');
const sendEmail = require('../../utils/email');

class AuthService {
  async register(email, password, firstName, lastName, role = 'candidate') {
    const existingUser = await authRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email address is already registered.', 400);
    }

    const user = await authRepository.createUser({
      email,
      passwordHash: password,
      role,
    });

    await authRepository.createProfile({
      userId: user._id,
      firstName,
      lastName,
    });

    const verifyToken = user.createVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      const verifyURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verifyToken}`;
      const message = `Welcome to AI InterviewOS! Please verify your email by clicking on the link below:\n\n${verifyURL}\n\nThis token is valid until you verify.`;

      await sendEmail({
        email: user.email,
        subject: 'Verify your AI InterviewOS Account',
        message,
        html: `<p>Welcome to AI InterviewOS! Please click the link below to verify your account:</p><a href="${verifyURL}">${verifyURL}</a>`,
      });
    } catch (err) {
      console.error('Failed to send verification email:', err.message);
    }

    return user;
  }

  async login(email, password) {
    const user = await authRepository.findByEmail(email, true);
    if (!user) {
      throw new AppError('Invalid email or password. Register First', 401);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new AppError('Incorrect password.', 401);
    }

    if (user.status !== 'active') {
      throw new AppError(`Your account has been ${user.status}. Please contact support.`, 403);
    }

    if (!user.isVerified) {
      throw new AppError('Please verify your email address before logging in.', 401);
    }

    user.lastLoginAt = Date.now();
    await user.save({ validateBeforeSave: false });

    return user;
  }

  async verifyEmail(token) {
    console.log('--- EMAIL VERIFICATION DEBUG ---');
    console.log(`Received raw token from URL: ${token}`);
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    console.log(`Computed hash to match in DB: ${hashedToken}`);
    console.log('---------------------------------');

    const user = await authRepository.findByVerificationToken(hashedToken);
    if (!user) {
      throw new AppError('Verification token is invalid or has expired.', 400);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    return user;
  }

  async forgotPassword(email) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw new AppError('There is no user with that email address.', 404);
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      const message = `You requested a password reset. Please click on the link below to set a new password:\n\n${resetURL}\n\nIf you did not request this, please ignore this email.`;

      await sendEmail({
        email: user.email,
        subject: 'AI InterviewOS Password Reset Token (valid for 10 minutes)',
        message,
        html: `<p>Please click the link below to reset your password:</p><a href="${resetURL}">${resetURL}</a>`,
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      throw new AppError('There was an error sending the reset email. Try again later.', 500);
    }

    return resetToken;
  }

  async resetPassword(token, newPassword) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await authRepository.findByResetToken(hashedToken);
    if (!user) {
      throw new AppError('Reset token is invalid or has expired.', 400);
    }

    user.passwordHash = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return user;
  }

  async refreshAccessToken(token) {
    if (!token) {
      throw new AppError('Refresh token not provided.', 401);
    }

    // Verify token validity
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-67890');
    } catch (err) {
      throw new AppError('Refresh token is invalid or expired.', 401);
    }

    // Verify user still exists and is active
    const user = await authRepository.findById(decoded.id);
    if (!user) {
      throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    if (user.status !== 'active') {
      throw new AppError('User account is deactivated or suspended.', 403);
    }

    return user;
  }

  async updatePassword(userId, currentPassword, newPassword) {
    const user = await authRepository.findById(userId, true);
    if (!user) {
      throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 401);
    }

    user.passwordHash = newPassword;
    await user.save();

    return user;
  }

  async resendVerificationEmail(email) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw new AppError('There is no user with that email address.', 404);
    }

    if (user.isVerified) {
      throw new AppError('This account is already verified.', 400);
    }

    const verifyToken = user.createVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      const verifyURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verifyToken}`;
      const message = `Welcome back! Please verify your email by clicking on the link below:\n\n${verifyURL}\n\nThis token is valid until you verify.`;

      await sendEmail({
        email: user.email,
        subject: 'Verify your AI InterviewOS Account',
        message,
        html: `<p>Welcome back! Please click the link below to verify your account:</p><a href="${verifyURL}">${verifyURL}</a>`,
      });
    } catch (err) {
      throw new AppError('There was an error sending the verification email. Try again later.', 500);
    }
  }
}

module.exports = new AuthService();
