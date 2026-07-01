const mongoose = require('mongoose');

const SuspiciousEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ['no_face', 'multiple_faces', 'phone_detected', 'looking_away'],
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
  durationSec: {
    type: Number,
  },
});

const VideoSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: [true, 'Session ID is required'],
      unique: true,
    },
    eyeContactPercent: {
      type: Number,
      min: 0,
      max: 100,
    },
    averageAttentionScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    averageConfidenceScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    averageEngagementScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    expressionAnalysis: {
      neutral: { type: Number, default: 100 },
      happy: { type: Number, default: 0 },
      surprised: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
    },
    suspiciousEvents: [SuspiciousEventSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
VideoSessionSchema.index({ sessionId: 1 });

module.exports = mongoose.model('VideoSession', VideoSessionSchema);
