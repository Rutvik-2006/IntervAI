const interviewRepository = require('./interview.repository');
const resumeRepository = require('../resume/resume.repository');
const aiEngine = require('../../utils/aiEngine');
const AppError = require('../../utils/appError');

class InterviewService {
  /**
   * Question templates tailored by interview type and role
   */
  static QUESTION_BANK = {
    technical: [
      {
        text: 'Can you explain the architecture and key tradeoffs of a project you built recently?',
        idealAnswer: 'Candidate should describe client-server architecture, database choices, state management, API design, and performance optimizations.',
        difficulty: 'medium',
      },
      {
        text: 'How do you approach performance optimization and memory management in high-scale applications?',
        idealAnswer: 'Candidate should mention profiling tools, caching strategies, lazy loading, database indexing, and query optimization.',
        difficulty: 'hard',
      },
      {
        text: 'What are the differences between synchronous and asynchronous processing, and when would you use each?',
        idealAnswer: 'Candidate should explain non-blocking event loops, async/await, message queues (RabbitMQ/Kafka), and background worker processing.',
        difficulty: 'medium',
      },
      {
        text: 'How do you ensure state consistency and secure data flow across microservices or decoupled client-server systems?',
        idealAnswer: 'Candidate should mention JWT tokens, HTTP-only cookies, idempotent APIs, database transactions, and CORS configurations.',
        difficulty: 'hard',
      },
      {
        text: 'What strategies do you use for error handling and logging in production applications?',
        idealAnswer: 'Candidate should describe global error middleware, custom operational error classes, centralized loggers (Winston/Sentry), and graceful shutdowns.',
        difficulty: 'medium',
      },
    ],
    hr: [
      {
        text: 'Tell me about yourself, your background, and why you are interested in joining our team.',
        idealAnswer: 'Candidate should present a concise 2-minute elevator pitch highlighting technical skills, past impact, and alignment with company goals.',
        difficulty: 'easy',
      },
      {
        text: 'Why do you want to work at this company specifically over other options?',
        idealAnswer: 'Candidate should mention specific product engineering values, tech stack innovation, or company culture metrics.',
        difficulty: 'easy',
      },
      {
        text: 'Where do you see your technical career progressing over the next 3 to 5 years?',
        idealAnswer: 'Candidate should outline growth towards senior engineering, architectural leadership, or mentoring junior developers.',
        difficulty: 'medium',
      },
      {
        text: 'What environment or culture brings out your best performance as a developer?',
        idealAnswer: 'Candidate should describe collaborative code reviews, continuous deployment, autonomy, and constructive feedback loops.',
        difficulty: 'easy',
      },
      {
        text: 'What is your expected approach to balancing speed of delivery with code quality?',
        idealAnswer: 'Candidate should discuss MVP prioritization, writing testable modular code, avoiding technical debt, and automated linting.',
        difficulty: 'medium',
      },
    ],
    behavioral: [
      {
        text: 'Describe a situation where you faced a tough technical disagreement with a teammate. How did you resolve it?',
        idealAnswer: 'Candidate should use the STAR framework (Situation, Task, Action, Result) to demonstrate active listening, data-driven decisions, and teamwork.',
        difficulty: 'medium',
      },
      {
        text: 'Tell me about a time a project missed a deadline or failed. What happened and what did you learn?',
        idealAnswer: 'Candidate should show ownership, root-cause reflection, communication with stakeholders, and post-mortem execution.',
        difficulty: 'medium',
      },
      {
        text: 'Give an example of a complex feature you delivered under tight timeline pressure.',
        idealAnswer: 'Candidate should outline scope prioritization, risk mitigation, clear documentation, and efficient task breakdown.',
        difficulty: 'medium',
      },
      {
        text: 'Describe a time you received constructive criticism on your code. How did you handle it?',
        idealAnswer: 'Candidate should demonstrate open-mindedness, professionalism, learning mindset, and immediate integration into coding practices.',
        difficulty: 'easy',
      },
      {
        text: 'How do you mentor junior team members or share technical knowledge across a team?',
        idealAnswer: 'Candidate should explain documentation habits, pair programming, internal tech talks, and supportive code review practices.',
        difficulty: 'medium',
      },
    ],
    system_design: [
      {
        text: 'How would you design a scalable real-time notifications system for millions of concurrent users?',
        idealAnswer: 'Candidate should describe WebSockets, Redis Pub/Sub, push notification queues, database sharding, and fallback polling.',
        difficulty: 'hard',
      },
      {
        text: 'Design a URL shortener service (like Bitly). What database schema and caching layer would you choose?',
        idealAnswer: 'Candidate should cover Base62 encoding, unique ID generation, Redis caching, relational vs NoSQL database tradeoffs, and rate limiting.',
        difficulty: 'medium',
      },
      {
        text: 'How would you architect an end-to-end file upload and processing pipeline for large video files?',
        idealAnswer: 'Candidate should mention pre-signed S3 URLs, multipart chunk uploads, background worker processing (Celery/RabbitMQ), and CDN distribution.',
        difficulty: 'hard',
      },
      {
        text: 'Design an API rate limiter to prevent DDoS attacks and brute-force attempts on an enterprise platform.',
        idealAnswer: 'Candidate should cover Token Bucket / Sliding Window algorithms, Distributed Redis rate limiting, HTTP status 429, and proxy headers.',
        difficulty: 'medium',
      },
      {
        text: 'How would you ensure high availability and zero-downtime deployments for a core microservices infrastructure?',
        idealAnswer: 'Candidate should explain load balancers, blue-green or canary deployments, health checks, database migrations, and auto-scaling.',
        difficulty: 'hard',
      },
    ],
  };

  /**
   * Evaluate a candidate's answer across accuracy, completeness, depth, and relevance
   */
  evaluateCandidateAnswer(question, answerText) {
    const text = (answerText || '').trim();
    const wordCount = text.split(/\s+/).length;

    let accuracy = 70;
    let completeness = 70;
    let depth = 65;
    let relevance = 75;

    // Evaluate based on answer length & substance
    if (wordCount >= 80) {
      completeness += 20;
      depth += 20;
      accuracy += 15;
    } else if (wordCount >= 40) {
      completeness += 10;
      depth += 10;
      accuracy += 10;
    } else if (wordCount < 15) {
      completeness -= 25;
      depth -= 30;
      accuracy -= 20;
    }

    // Check for domain keyword presence from question/ideal answer
    const idealKeywords = (question.idealAnswer || '').toLowerCase().match(/\w{4,}/g) || [];
    let matchedKeywords = 0;
    idealKeywords.forEach((kw) => {
      if (text.toLowerCase().includes(kw)) {
        matchedKeywords++;
      }
    });

    if (matchedKeywords >= 3) {
      relevance += 15;
      accuracy += 10;
    }

    // Clamp values between 0 and 100
    accuracy = Math.min(Math.max(accuracy, 30), 100);
    completeness = Math.min(Math.max(completeness, 30), 100);
    depth = Math.min(Math.max(depth, 30), 100);
    relevance = Math.min(Math.max(relevance, 30), 100);

    const overallScore = Math.round((accuracy + completeness + depth + relevance) / 4);

    // Dynamic feedback generation tailored strictly to candidate's exact words
    const feedbackParts = [];
    const techWordsFound = text.match(/\b[A-Za-z]{4,}\b/g) || [];
    const uniqueKeywords = Array.from(new Set(techWordsFound.slice(0, 5)));

    if (uniqueKeywords.length > 0) {
      feedbackParts.push(`Your answer focused on key topics such as ${uniqueKeywords.slice(0, 3).join(', ')}.`);
    }

    if (wordCount >= 50) {
      feedbackParts.push(`Detailed ${wordCount}-word response showing solid technical explanation.`);
    } else {
      feedbackParts.push(`Response length is ${wordCount} words. Consider elaborating with specific architecture or production examples.`);
    }

    const feedback = feedbackParts.join(' ');

    // Integrate Python Microservice Voice Analysis metrics if audio transcription present
    const pythonAiClient = require('../../utils/pythonAiClient');
    let voiceMetrics = null;
    let visionMetrics = null;

    if (text.length > 0) {
      // Async request to Python Voice microservice
      pythonAiClient.analyzeVoice(text, 30.0).then((vRes) => {
        if (vRes) voiceMetrics = vRes;
      }).catch(() => { });

      // Async request to Python Vision microservice
      pythonAiClient.analyzeVision(null).then((visRes) => {
        if (visRes) visionMetrics = visRes;
      }).catch(() => { });
    }

    return {
      score: overallScore,
      feedback,
      factors: { accuracy, completeness, depth, relevance },
      pythonVoiceMetrics: voiceMetrics,
      pythonVisionMetrics: visionMetrics
    };
  }

  /**
   * Generates dynamic contextual interview questions purely using AI Engine
   */
  async generateDynamicQuestions(session, activeResume, totalQuestions) {
    const questions = [];

    for (let i = 0; i < totalQuestions; i++) {
      const aiResult = await aiEngine.generateQuestion(
        session,
        '',
        i > 0 ? questions[i - 1].text : '',
        activeResume
      );

      questions.push({
        sessionId: session._id,
        text: aiResult.text,
        type: session.type,
        difficulty: session.difficulty,
        idealAnswer: aiResult.idealAnswer,
        order: i + 1,
        skills: activeResume?.skills || [],
      });
    }

    return questions;
  }

  /**
   * Generates real-time adaptive follow-up question via Hybrid AI Engine
   */
  async generateAdaptiveFollowUpQuestion(session, candidateAnswerText, previousQuestionText, nextOrder, activeResume) {
    const aiResult = await aiEngine.generateQuestion(session, candidateAnswerText, previousQuestionText, activeResume);

    return {
      sessionId: session._id,
      text: aiResult.text,
      type: session.type,
      difficulty: session.difficulty,
      idealAnswer: aiResult.idealAnswer,
      order: nextOrder,
      skills: [],
    };
  }

  async startSession(userId, config) {
    const {
      type = 'technical',
      mode = 'text',
      jobRole = 'Software Engineer',
      companyName = 'Tech Enterprise',
      difficulty = 'medium',
      totalQuestions = 5,
    } = config;

    // Get active resume if available
    const activeResume = await resumeRepository.findActiveResumeByUserId(userId);

    // Create InterviewSession document
    const session = await interviewRepository.createSession({
      userId,
      resumeId: activeResume ? activeResume._id : null,
      type,
      mode,
      jobRole,
      companyName,
      difficulty,
      totalQuestions: mode === 'coding' ? 1 : totalQuestions,
      currentQuestionIndex: 0,
      status: 'in_progress',
      startedAt: new Date(),
    });

    if (mode === 'coding') {
      return {
        session,
        firstQuestion: null,
      };
    }

    // Generate all interview questions dynamically via AI Engine using candidate's resume
    const dynamicQuestions = await this.generateDynamicQuestions(session, activeResume, totalQuestions);
    const createdQuestions = await interviewRepository.createQuestions(dynamicQuestions);

    return {
      session,
      firstQuestion: createdQuestions[0],
    };
  }

  async getCurrentQuestion(userId, sessionId) {
    const session = await interviewRepository.findSessionById(sessionId);
    if (!session) {
      throw new AppError('Interview session not found.', 404);
    }

    if (session.userId.toString() !== userId.toString()) {
      throw new AppError('Unauthorized access to this interview session.', 403);
    }

    if (session.mode === 'coding') {
      return {
        session,
        question: null,
      };
    }

    const questionOrder = session.currentQuestionIndex + 1;
    const question = await interviewRepository.findQuestionBySessionAndOrder(sessionId, questionOrder);

    return {
      session,
      question,
    };
  }

  async submitAnswer(userId, sessionId, questionId, candidateAnswer, duration = 30.0) {
    const session = await interviewRepository.findSessionById(sessionId);
    if (!session) {
      throw new AppError('Interview session not found.', 404);
    }

    if (session.userId.toString() !== userId.toString()) {
      throw new AppError('Unauthorized access to this interview session.', 403);
    }

    if (session.status !== 'in_progress') {
      throw new AppError('This interview session is already completed.', 400);
    }

    let question = await interviewRepository.findQuestionBySessionAndOrder(sessionId, session.currentQuestionIndex + 1);
    if (!question) {
      question = await interviewRepository.findQuestionById(questionId);
    }

    if (!question) {
      throw new AppError('Question not found for current sequence.', 400);
    }

    // Evaluate response using Gemini LLM AI Engine (with heuristic fallback)
    let evaluation = await aiEngine.evaluateAnswer(question, candidateAnswer);
    if (!evaluation) {
      evaluation = this.evaluateCandidateAnswer(question, candidateAnswer);
    }

    console.log(`🤖 [AI Engine] Submitted Answer Evaluated | Score: ${evaluation.score}/100 | Source: ${evaluation.source || 'ai_engine'}`);

    // Call Python FastAPI microservice for Voice & Vision metrics
    const pythonAiClient = require('../../utils/pythonAiClient');
    if (candidateAnswer && candidateAnswer.trim().length > 0) {
      const speechDuration = duration && Number(duration) > 0 ? Number(duration) : 30.0;
      const vMetrics = await pythonAiClient.analyzeVoice(candidateAnswer, speechDuration);
      const visMetrics = await pythonAiClient.analyzeVision(null);
      if (vMetrics) evaluation.pythonVoiceMetrics = vMetrics;
      if (visMetrics) evaluation.pythonVisionMetrics = visMetrics;
    }

    // Save Answer document
    const answer = await interviewRepository.createAnswer({
      sessionId,
      questionId,
      candidateAnswer,
      evaluation,
    });

    // Advance session progress index
    const newIndex = session.currentQuestionIndex + 1;
    session.currentQuestionIndex = newIndex;

    let nextQuestion = null;
    let report = null;

    if (newIndex >= session.totalQuestions) {
      // Session finished -> Complete session and generate Report
      session.status = 'completed';
      session.completedAt = new Date();
      report = await this.generateReportForSession(userId, session);
    } else {
      // Generate REAL-TIME ADAPTIVE FOLLOW-UP QUESTION based on candidate's answer!
      const activeResume = await resumeRepository.findActiveResumeByUserId(userId);
      const followUpData = await this.generateAdaptiveFollowUpQuestion(
        session,
        candidateAnswer,
        question.text,
        newIndex + 1,
        activeResume
      );

      const created = await interviewRepository.createQuestions([followUpData]);
      nextQuestion = created[0];
    }

    await session.save();

    return {
      session,
      answer,
      nextQuestion,
      isCompleted: session.status === 'completed',
      report,
    };
  }

  async generateReportForSession(userId, session) {
    const answers = await interviewRepository.findAnswersBySessionId(session._id);

    let totalScore = 0;
    let totalAccuracy = 0;
    let totalCompleteness = 0;
    let totalDepth = 0;
    let totalRelevance = 0;
    let totalVoiceComm = 0;
    let voiceCount = 0;

    answers.forEach((ans) => {
      const ev = ans.evaluation || {};
      const scoreVal = typeof ev.score === 'number' && !isNaN(ev.score) ? ev.score : 0;
      totalScore += scoreVal;

      const f = ev.factors || {};
      const acc = typeof f.accuracy === 'number' && !isNaN(f.accuracy) ? f.accuracy : scoreVal;
      const comp = typeof f.completeness === 'number' && !isNaN(f.completeness) ? f.completeness : scoreVal;
      const dep = typeof f.depth === 'number' && !isNaN(f.depth) ? f.depth : scoreVal;
      const rel = typeof f.relevance === 'number' && !isNaN(f.relevance) ? f.relevance : scoreVal;

      totalAccuracy += acc;
      totalCompleteness += comp;
      totalDepth += dep;
      totalRelevance += rel;

      if (ev.pythonVoiceMetrics && typeof ev.pythonVoiceMetrics.communication_score === 'number') {
        totalVoiceComm += ev.pythonVoiceMetrics.communication_score;
        voiceCount++;
      }
    });

    const count = answers.length || 1;
    const overallScore = Math.min(100, Math.max(0, Math.round(totalScore / count)));
    const avgAccuracy = Math.min(100, Math.max(0, Math.round(totalAccuracy / count)));
    const avgDepth = Math.min(100, Math.max(0, Math.round(totalDepth / count)));

    let avgCommunication = Math.round((totalCompleteness + totalRelevance) / (2 * count));
    if (voiceCount > 0) {
      const avgVoiceComm = Math.round(totalVoiceComm / voiceCount);
      avgCommunication = Math.round((avgCommunication + avgVoiceComm) / 2);
    }
    avgCommunication = Math.min(100, Math.max(0, avgCommunication));

    // Generate dynamic AI performance summary report & AI scores based on actual candidate answers
    const aiReportData = await aiEngine.generateSessionReportSummary(session, answers);

    // Update Session scores summary from AI Report Data (preserving 0 scores)
    const finalOverallScore = typeof aiReportData?.overallScore === 'number' ? aiReportData.overallScore : overallScore;
    const finalTechnicalAccuracy = typeof aiReportData?.technicalAccuracy === 'number' ? aiReportData.technicalAccuracy : avgAccuracy;
    const finalTechnicalDepth = typeof aiReportData?.technicalDepth === 'number' ? aiReportData.technicalDepth : avgDepth;
    const finalCommunicationClarity = typeof aiReportData?.communicationClarity === 'number' ? aiReportData.communicationClarity : avgCommunication;

    console.log(`🤖 [AI Engine] Session Completed! Final AI Overall Score: ${finalOverallScore}/100 | Technical Accuracy: ${finalTechnicalAccuracy}% | Technical Depth: ${finalTechnicalDepth}% | Communication: ${finalCommunicationClarity}% | Source: ${aiReportData?.source || 'ai_engine'}`);

    session.scores = {
      overall: finalOverallScore,
      technical: finalTechnicalAccuracy,
      communication: finalCommunicationClarity,
      confidence: finalTechnicalDepth,
      coding: 0,
    };
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    const formattedPlan = Array.isArray(aiReportData?.improvementPlan)
      ? aiReportData.improvementPlan.join('\n')
      : (aiReportData?.improvementPlan || '1. Practice step-by-step system design trade-offs.\n2. Review core database indexing and caching patterns.\n3. Prepare concrete production metrics.');

    const report = await interviewRepository.createReport({
      userId,
      sessionId: session._id,
      overallSummary: aiReportData?.overallSummary || 'Interview completed.',
      strengths: Array.isArray(aiReportData?.strengths) ? aiReportData.strengths : [],
      weaknesses: Array.isArray(aiReportData?.weaknesses) ? aiReportData.weaknesses : ['Focus on elaborating with concrete technical examples and architecture trade-offs.'],
      improvementPlan: formattedPlan,
      cheatingFlagged: false,
    });

    return report;
  }

  async getSessionReport(userId, sessionId) {
    const session = await interviewRepository.findSessionById(sessionId);
    if (!session) {
      throw new AppError('Session not found.', 404);
    }

    if (session.userId.toString() !== userId.toString()) {
      throw new AppError('Unauthorized access to report.', 403);
    }

    const report = await interviewRepository.findReportBySessionId(sessionId);
    const answers = await interviewRepository.findAnswersBySessionId(sessionId);

    return {
      session,
      report,
      answers,
    };
  }

  async getUserSessions(userId) {
    return await interviewRepository.findUserSessions(userId);
  }
}

module.exports = new InterviewService();
