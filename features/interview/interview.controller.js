const interviewService = require('./interview.service');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');

class InterviewController {
  startSession = catchAsync(async (req, res, next) => {
    const { session, firstQuestion } = await interviewService.startSession(req.user._id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Interview session initialized successfully!',
      data: {
        session,
        firstQuestion,
      },
    });
  });

  getCurrentQuestion = catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;

    const { session, question } = await interviewService.getCurrentQuestion(req.user._id, sessionId);

    res.status(200).json({
      status: 'success',
      data: {
        session,
        question,
      },
    });
  });

  submitAnswer = catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;
    const { questionId, candidateAnswer, duration } = req.body;

    if (!candidateAnswer) {
      return next(new AppError('Please provide your answer before submitting.', 400));
    }

    const result = await interviewService.submitAnswer(
      req.user._id,
      sessionId,
      questionId,
      candidateAnswer,
      duration
    );

    res.status(200).json({
      status: 'success',
      message: result.isCompleted
        ? 'Interview completed! Report generated.'
        : 'Answer evaluated successfully.',
      data: result,
    });
  });

  getReport = catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;

    const reportData = await interviewService.getSessionReport(req.user._id, sessionId);

    res.status(200).json({
      status: 'success',
      data: reportData,
    });
  });

  logCheatingEvent = catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;
    const { eventType, severity, details } = req.body;

    const log = await interviewService.logCheatingEvent(req.user._id, sessionId, eventType, severity, details);

    res.status(201).json({
      status: 'success',
      data: { log },
    });
  });

  getHistory = catchAsync(async (req, res, next) => {
    const sessions = await interviewService.getUserSessions(req.user._id);

    res.status(200).json({
      status: 'success',
      data: {
        sessions,
      },
    });
  });
}

module.exports = new InterviewController();
