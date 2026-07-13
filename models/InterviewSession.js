const mongoose = require('mongoose');

const InterviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
    },
    type: {
      type: String,
      required: [true, 'Interview type is required'],
      enum: ['hr', 'behavioral', 'technical', 'system_design', 'coding'],
    },
    mode: {
      type: String,
      required: [true, 'Interview mode is required'],
      enum: ['text', 'voice', 'video', 'coding'],
    },
    jobRole: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['scheduled', 'in_progress', 'completed', 'failed'],
      default: 'in_progress',
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty is required'],
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    totalQuestions: {
      type: Number,
      required: [true, 'Total questions count is required'],
      default: 5,
    },
    currentQuestionIndex: {
      type: Number,
      required: [true, 'Current question index is required'],
      default: 0,
    },
    durationLimit: {
      type: Number, // in minutes
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    scores: {
      overall: { type: Number },
      technical: { type: Number },
      communication: { type: Number },
      confidence: { type: Number },
      coding: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
InterviewSessionSchema.index({ userId: 1 });
InterviewSessionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
