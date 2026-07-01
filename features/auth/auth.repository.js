const User = require('../../models/User');
const Profile = require('../../models/Profile');

class AuthRepository {
  async findByEmail(email, selectPassword = false) {
    const query = User.findOne({ email });
    if (selectPassword) {
      query.select('+passwordHash');
    }
    return await query;
  }

  async findById(id, selectPassword = false) {
    const query = User.findById(id);
    if (selectPassword) {
      query.select('+passwordHash');
    }
    return await query;
  }

  async findByResetToken(hashedToken) {
    return await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
  }

  async findByVerificationToken(hashedToken) {
    return await User.findOne({
      verificationToken: hashedToken,
    });
  }

  async createUser(userData) {
    return await User.create(userData);
  }

  async createProfile(profileData) {
    return await Profile.create(profileData);
  }

  async findProfileByUserId(userId) {
    return await Profile.findOne({ userId });
  }
}

module.exports = new AuthRepository();
