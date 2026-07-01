const jwt = require('jsonwebtoken');

const signAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-key-12345',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
};

const signRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-67890',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  const req = res.req;

  const cookieOptions = {
    expires: new Date(
      Date.now() + 
      (parseInt(process.env.JWT_COOKIE_EXPIRES_IN_DAYS || '7') * 24 * 60 * 60 * 1000)
    ),
    httpOnly: true, // Prevents XSS script execution accessing token cookies
    secure: process.env.NODE_ENV === 'production' || (req && (req.secure || req.headers['x-forwarded-proto'] === 'https')),
    sameSite: 'strict', // Mitigates Cross-Site Request Forgery (CSRF)
  };

  // Set cookies
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    expires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
  });

  res.cookie('refreshToken', refreshToken, cookieOptions);

  // Remove password hash from JSON response
  user.passwordHash = undefined;

  res.status(statusCode).json({
    status: 'success',
    accessToken,
    data: {
      user,
    },
  });
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  sendTokenResponse,
};
