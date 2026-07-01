const mongoose = require('mongoose');

const TestCaseResultSchema = new mongoose.Schema({
  testCaseId: { type: mongoose.Schema.Types.ObjectId },
  passed: { type: Boolean, required: true },
  runTimeMs: { type: Number },
  memoryUsageKb: { type: Number },
  actualOutput: { type: String },
  errorMessage: { type: String },
});

const CodingSubmissionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: [true, 'Session ID is required'],
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question ID is required'],
    },
    code: {
      type: String,
      required: [true, 'Code submission is required'],
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      enum: ['python', 'java', 'javascript', 'cpp', 'go'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: [
        'executing',
        'accepted',
        'wrong_answer',
        'runtime_error',
        'compile_error',
        'time_limit_exceeded',
      ],
      default: 'executing',
    },
    results: [TestCaseResultSchema],
    metrics: {
      runtimeComplexity: { type: String },
      spaceComplexity: { type: String },
      correctnessRatio: { type: Number, min: 0, max: 1 },
    },
    aiFeedback: {
      codeQualityScore: { type: Number, min: 0, max: 100 },
      suggestions: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CodingSubmissionSchema.index({ sessionId: 1 });
CodingSubmissionSchema.index({ sessionId: 1, questionId: 1 });

module.exports = mongoose.model('CodingSubmission', CodingSubmissionSchema);
