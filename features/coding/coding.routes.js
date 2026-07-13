const express = require('express');
const codingController = require('./coding.controller');
const authMiddleware = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.get('/session/:sessionId', codingController.getCodingQuestion);
router.post('/execute', codingController.executeCode);
router.post('/session/:sessionId/submit', codingController.submitCodingSolution);

module.exports = router;
