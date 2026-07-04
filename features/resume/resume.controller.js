const resumeService = require('./resume.service');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');

class ResumeController {
  uploadResume = catchAsync(async (req, res, next) => {
    if (!req.file) {
      return next(new AppError('Please select a PDF file to upload.', 400));
    }

    const resume = await resumeService.uploadAndProcessResume(req.user._id, req.file);

    res.status(201).json({
      status: 'success',
      message: 'Resume uploaded and analyzed successfully!',
      data: {
        resume,
      },
    });
  });

  getActiveResume = catchAsync(async (req, res, next) => {
    const resume = await resumeService.getActiveResume(req.user._id);

    if (!resume) {
      return res.status(200).json({
        status: 'success',
        data: {
          resume: null,
        },
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        resume,
      },
    });
  });

  getResumes = catchAsync(async (req, res, next) => {
    const resumes = await resumeService.getUserResumes(req.user._id);

    res.status(200).json({
      status: 'success',
      data: {
        resumes,
      },
    });
  });
}

module.exports = new ResumeController();
