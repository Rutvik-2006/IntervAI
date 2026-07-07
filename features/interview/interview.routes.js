const express = require('express');
const interviewController = require('./interview.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// Require authentication for all interview endpoints
router.use(protect);

router.post('/start', interviewController.startSession);
router.get('/history', interviewController.getHistory);
router.get('/:sessionId/current-question', interviewController.getCurrentQuestion);
router.post('/:sessionId/submit-answer', interviewController.submitAnswer);
router.get('/:sessionId/report', interviewController.getReport);

module.exports = router;
