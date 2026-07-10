const mongoose = require('mongoose');

const EvaluationSchema = new mongoose.Schema({
  score: {
    type: Number,
    min: 0,
    max: 100,
  },
  feedback: {
    type: String,
  },
  factors: {
    accuracy: { type: Number, min: 0, max: 100 },
    completeness: { type: Number, min: 0, max: 100 },
    depth: { type: Number, min: 0, max: 100 },
    relevance: { type: Number, min: 0, max: 100 },
    fluency: { type: Number, min: 0, max: 100 },
    clarity: { type: Number, min: 0, max: 100 },
    vocabulary: { type: Number, min: 0, max: 100 },
  },
  pythonVoiceMetrics: {
    type: mongoose.Schema.Types.Mixed,
  },
  pythonVisionMetrics: {
    type: mongoose.Schema.Types.Mixed,
  },
});

const AnswerSchema = new mongoose.Schema(
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
      unique: true,
    },
    candidateAnswer: {
      type: String,
      required: [true, 'Candidate answer is required'],
      default: '',
    },
    mediaUrl: {
      type: String,
    },
    evaluation: EvaluationSchema,
  },
  {
    timestamps: true,
  }
);

// Indexes
AnswerSchema.index({ sessionId: 1 });

module.exports = mongoose.model('Answer', AnswerSchema);
