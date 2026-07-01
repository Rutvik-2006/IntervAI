const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: [true, 'Session ID is required'],
      unique: true,
    },
    overallSummary: {
      type: String,
      required: [true, 'Overall summary is required'],
      minlength: 50,
    },
    strengths: [
      {
        type: String,
        required: true,
      },
    ],
    weaknesses: [
      {
        type: String,
        required: true,
      },
    ],
    improvementPlan: {
      type: String,
      required: [true, 'Improvement plan is required'],
    },
    pdfUrl: {
      type: String,
    },
    cheatingFlagged: {
      type: Boolean,
      required: true,
      default: false,
    },
    cheatingDetails: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ReportSchema.index({ userId: 1 });
ReportSchema.index({ sessionId: 1 });

module.exports = mongoose.model('Report', ReportSchema);
