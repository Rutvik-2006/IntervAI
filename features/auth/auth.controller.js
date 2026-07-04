const authService = require('./auth.service');
const catchAsync = require('../../utils/catchAsync');
const { sendTokenResponse } = require('../../utils/jwt');
const AppError = require('../../utils/appError');
const authRepository = require('./auth.repository');

class AuthController {
  register = catchAsync(async (req, res, next) => {
    const { email, password, firstName, lastName, role } = req.body;

    const user = await authService.register(
      email,
      password,
      firstName,
      lastName,
      role
    );

    res.status(201).json({
      status: 'success',
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        userId: user._id,
        email: user.email,
      },
    });
  });

  login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await authService.login(email, password);

    // Send access and refresh tokens via cookies
    sendTokenResponse(user, 200, res);
  });

  logout = catchAsync(async (req, res, next) => {
    // Clear cookies with SameSite strict
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };

    res.cookie('accessToken', 'loggedout', {
      ...cookieOptions,
      expires: new Date(Date.now() + 10 * 1000), // expire in 10s
    });

    res.cookie('refreshToken', 'loggedout', {
      ...cookieOptions,
      expires: new Date(Date.now() + 10 * 1000),
    });

    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out.',
    });
  });

  verifyEmail = catchAsync(async (req, res, next) => {
    const { token } = req.query;

    if (!token) {
      return next(new AppError('Verification token query parameter is missing.', 400));
    }

    await authService.verifyEmail(token);

    res.status(200).json({
      status: 'success',
      message: 'Email successfully verified! You can now log in.',
    });
  });

  forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    await authService.forgotPassword(email);

    res.status(200).json({
      status: 'success',
      message: 'Password reset link sent to your email address.',
    });
  });

  resetPassword = catchAsync(async (req, res, next) => {
    const { token } = req.query;
    const { password } = req.body;

    if (!token) {
      return next(new AppError('Reset token query parameter is missing.', 400));
    }

    const user = await authService.resetPassword(token, password);

    // Log the user in directly after resetting their password
    sendTokenResponse(user, 200, res);
  });

  getCurrentUser = catchAsync(async (req, res, next) => {
    // req.user is populated by the protect middleware
    const user = req.user;

    // Fetch profile
    const profile = await authRepository.findProfileByUserId(user._id);

    res.status(200).json({
      status: 'success',
      data: {
        user,
        profile,
      },
    });
  });

  refresh = catchAsync(async (req, res, next) => {
    // Try to get token from signed/unsigned cookies or request body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return next(new AppError('No refresh token provided.', 401));
    }

    const user = await authService.refreshAccessToken(refreshToken);

    // Send new tokens
    sendTokenResponse(user, 200, res);
  });

  updatePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, password } = req.body;
    const userId = req.user._id;

    const user = await authService.updatePassword(userId, currentPassword, password);

    // Send newly generated access token and refresh token in cookie/headers
    sendTokenResponse(user, 200, res);
  });

  resendVerification = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    await authService.resendVerificationEmail(email);

    res.status(200).json({
      status: 'success',
      message: 'Verification link has been resent to your email address.',
    });
  });
}

module.exports = new AuthController();
