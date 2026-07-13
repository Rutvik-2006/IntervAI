const mongoose = require('mongoose');

const TestCaseSchema = new mongoose.Schema({
  id: Number,
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  explanation: String,
});

const CodingQuestionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Coding question title is required'],
    },
    prompt: {
      type: String,
      required: [true, 'Coding problem statement is required'],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    constraints: {
      type: String,
    },
    starterTemplates: {
      python: String,
      javascript: String,
      cpp: String,
      java: String,
    },
    sampleTestCases: [TestCaseSchema],
    hiddenTestCases: [TestCaseSchema],
  },
  {
    timestamps: true,
  }
);

// Indexing
CodingQuestionSchema.index({ sessionId: 1 });

module.exports = mongoose.model('CodingQuestion', CodingQuestionSchema);
