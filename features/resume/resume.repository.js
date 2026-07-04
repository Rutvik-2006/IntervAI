const Resume = require('../../models/Resume');

class ResumeRepository {
  async createResume(resumeData) {
    return await Resume.create(resumeData);
  }

  async findActiveResumeByUserId(userId) {
    return await Resume.findOne({ userId, isActive: true });
  }

  async findResumesByUserId(userId) {
    return await Resume.find({ userId }).sort({ createdAt: -1 });
  }

  async deactivateAllResumesForUser(userId) {
    return await Resume.updateMany({ userId }, { isActive: false });
  }

  async findById(resumeId) {
    return await Resume.findById(resumeId);
  }
}

module.exports = new ResumeRepository();
