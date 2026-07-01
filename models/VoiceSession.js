const mongoose = require('mongoose');

const FillerWordSchema = new mongoose.Schema({
  word: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
});

const VoiceSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: [true, 'Session ID is required'],
      unique: true,
    },
    averageWordsPerMinute: {
      type: Number,
    },
    overallFluencyScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    overallClarityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    overallCommunicationScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    detectedFillerWords: [FillerWordSchema],
    pauseAnalysis: {
      totalPauses: { type: Number, default: 0 },
      averagePauseDurationSec: { type: Number, default: 0 },
    },
    audioFormat: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
VoiceSessionSchema.index({ sessionId: 1 });

module.exports = mongoose.model('VoiceSession', VoiceSessionSchema);
