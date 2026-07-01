const mongoose = require('mongoose');

const TestCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false },
});

const CodingMetadataSchema = new mongoose.Schema({
  problemDescription: { type: String },
  boilerplateCode: {
    type: Map,
    of: String,
  },
  testCases: [TestCaseSchema],
});

const QuestionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: [true, 'Session ID is required'],
    },
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Question type is required'],
      enum: ['hr', 'behavioral', 'technical', 'system_design', 'coding'],
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty is required'],
      enum: ['easy', 'medium', 'hard'],
    },
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        required: true,
      },
    ],
    idealAnswer: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    codingMetadata: CodingMetadataSchema,
  },
  {
    timestamps: true,
  }
);

// Indexes
QuestionSchema.index({ sessionId: 1 });
QuestionSchema.index({ sessionId: 1, order: 1 });

module.exports = mongoose.model('Question', QuestionSchema);
