const codingService = require('./coding.service');
const catchAsync = require('../../utils/catchAsync');

exports.getCodingQuestion = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const question = await codingService.getOrCreateCodingQuestion(sessionId);

  res.status(200).json({
    status: 'success',
    data: { question },
  });
});

exports.executeCode = catchAsync(async (req, res, next) => {
  const { sourceCode, language, testCases } = req.body;
  const executionResult = await codingService.executeCode(sourceCode, language, testCases);

  res.status(200).json({
    status: 'success',
    data: { result: executionResult },
  });
});

exports.submitCodingSolution = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const { sourceCode, language, passCount, totalCount } = req.body;

  const submissionResult = await codingService.evaluateAndSubmit(
    sessionId,
    sourceCode,
    language,
    passCount,
    totalCount
  );

  res.status(200).json({
    status: 'success',
    data: submissionResult,
  });
});
