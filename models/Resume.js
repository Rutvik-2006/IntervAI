const mongoose = require('mongoose');

const EducationSchema = new mongoose.Schema({
  institution: { type: String, trim: true },
  degree: { type: String, trim: true },
  major: { type: String, trim: true },
  startYear: { type: Number },
  endYear: { type: Number },
});

const ExperienceSchema = new mongoose.Schema({
  company: { type: String, trim: true },
  role: { type: String, trim: true },
  description: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
});

const ProjectSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  technologies: [{ type: String, trim: true }],
});

const ResumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    parsedData: {
      education: [EducationSchema],
      experience: [ExperienceSchema],
      projects: [ProjectSchema],
    },
    skills: [{
      type: String,
      trim: true,
    }],
    atsScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    atsFeedback: {
      type: String,
    },
    rawText: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ResumeSchema.index({ userId: 1 });
ResumeSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Resume', ResumeSchema);
