const InterviewSession = require('../../models/InterviewSession');
const Question = require('../../models/Question');
const Answer = require('../../models/Answer');
const Report = require('../../models/Report');

class InterviewRepository {
  async createSession(sessionData) {
    return await InterviewSession.create(sessionData);
  }

  async findSessionById(sessionId) {
    return await InterviewSession.findById(sessionId);
  }

  async findUserSessions(userId) {
    return await InterviewSession.find({ userId }).sort({ createdAt: -1 });
  }

  async updateSession(sessionId, updateData) {
    return await InterviewSession.findByIdAndUpdate(sessionId, updateData, { new: true });
  }

  async createQuestions(questionsData) {
    return await Question.insertMany(questionsData);
  }

  async findQuestionsBySessionId(sessionId) {
    return await Question.find({ sessionId }).sort({ order: 1 });
  }

  async findQuestionBySessionAndOrder(sessionId, order) {
    return await Question.findOne({ sessionId, order });
  }

  async findQuestionById(questionId) {
    return await Question.findById(questionId);
  }

  async createAnswer(answerData) {
    return await Answer.create(answerData);
  }

  async findAnswersBySessionId(sessionId) {
    return await Answer.find({ sessionId }).populate('questionId');
  }

  async createReport(reportData) {
    return await Report.create(reportData);
  }

  async findReportBySessionId(sessionId) {
    return await Report.findOne({ sessionId });
  }
}

module.exports = new InterviewRepository();
