const axios = require('axios');

const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';

class PythonAIClient {
  async analyzeVoice(text, durationSeconds = 30.0) {
    try {
      const res = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/voice/analyze`, {
        text,
        duration_seconds: durationSeconds,
      }, { timeout: 5000 });
      return res.data;
    } catch (err) {
      console.warn('Python Voice Service unavailable, using Node fallback:', err.message);
      return null;
    }
  }

  async analyzeATS(resumeText, jobDescription) {
    try {
      const res = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/ats/analyze`, {
        resume_text: resumeText,
        job_description: jobDescription,
      }, { timeout: 5000 });
      return res.data;
    } catch (err) {
      console.warn('Python ATS Service unavailable, using Node fallback:', err.message);
      return null;
    }
  }

  async analyzeVision(frameData = null) {
    try {
      const res = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/vision/analyze`, {
        frame_data: frameData,
      }, { timeout: 5000 });
      return res.data;
    } catch (err) {
      console.warn('Python Vision Service unavailable, using Node fallback:', err.message);
      return null;
    }
  }

  async generateQuestion(session, candidateAnswerText = '', previousQuestionText = '', activeResume = null) {
    try {
      const resumeSkills = activeResume?.skills && Array.isArray(activeResume.skills) ? activeResume.skills : [];
      const res = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/questions/generate`, {
        session,
        candidateAnswerText,
        previousQuestionText,
        resumeSkills,
      }, { timeout: 12000 });
      return res.data;
    } catch (err) {
      console.warn('🐍 Python Question Service unavailable, falling back to Node local engine:', err.message);
      return null;
    }
  }

  async evaluateAnswer(question, answerText) {
    try {
      const res = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/questions/evaluate`, {
        questionText: question.text,
        idealAnswer: question.idealAnswer || '',
        candidateAnswer: answerText,
      }, { timeout: 10000 });
      return res.data;
    } catch (err) {
      console.warn('🐍 Python Answer Evaluation Service unavailable, falling back to Node local engine:', err.message);
      return null;
    }
  }

  async generateReportSummary(session, answers) {
    try {
      const res = await axios.post(`${PYTHON_AI_SERVICE_URL}/api/questions/report-summary`, {
        session,
        answers,
      }, { timeout: 12000 });
      return res.data;
    } catch (err) {
      console.warn('🐍 Python Report Summary Service unavailable, falling back to Node local engine:', err.message);
      return null;
    }
  }
}

module.exports = new PythonAIClient();
