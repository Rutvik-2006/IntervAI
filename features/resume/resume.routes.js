const express = require('express');
const multer = require('multer');
const resumeController = require('./resume.controller');
const { protect } = require('../../middleware/auth.middleware');
const AppError = require('../../utils/appError');

// Configure multer for memory storage (buffer processing)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF files are allowed.', 400), false);
    }
  },
});

const router = express.Router();

// Require authentication for all resume endpoints
router.use(protect);

router.post('/upload', upload.single('resume'), resumeController.uploadResume);
router.get('/active', resumeController.getActiveResume);
router.get('/all', resumeController.getResumes);

module.exports = router;
