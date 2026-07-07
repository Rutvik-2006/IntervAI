require('dotenv').config();
const axios = require('axios');
const pythonAiClient = require('./pythonAiClient');

class AIEngine {
  constructor() {
    this.lastApiCallTime = 0;
    this.minCallGapMs = 12000; // Strict 5 RPM Limit: 60s / 5 requests = 12,000ms per request
    this.queue = Promise.resolve();
    this.cache = new Map();
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async throttle() {
    const nextInQueue = this.queue.then(async () => {
      const now = Date.now();
      const elapsed = now - this.lastApiCallTime;
      if (elapsed < this.minCallGapMs) {
        const waitTime = this.minCallGapMs - elapsed;
        console.log(`⏱️ [AI Engine 5-RPM Rate-Limiter] Throttling request by ${Math.ceil(waitTime / 1000)}s to respect 5 RPM limit...`);
        await this.delay(waitTime);
      }
      this.lastApiCallTime = Date.now();
    });
    this.queue = nextInQueue;
    return nextInQueue;
  }

  async callGeminiWithFallback(prompt) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return null;
    }
    const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-001'];

    for (const model of models) {
      await this.throttle();
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              contents: [{ parts: [{ text: `${prompt}\nRespond ONLY in valid raw JSON format without markdown ticks.` }] }],
            },
            { timeout: 9000 }
          );

          const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            return { content, model, service: 'Google Gemini' };
          }
        } catch (err) {
          const status = err.response?.status;
          const apiErrorDetails = err.response?.data || err.message;

          if (status === 429) {
            console.warn(`⏳ [AI Engine 429 Limit] Model '${model}' rate limited (Attempt ${attempt}/2). Waiting ${attempt * 3}s backoff...`);
            if (attempt < 2) {
              await this.delay(attempt * 3000);
              continue;
            }
          } else {
            console.error(`❌ [AI Engine Error] Model '${model}' failed (Status: ${status}):\n`, JSON.stringify(apiErrorDetails, null, 2));
            break;
          }
        }
      }
    }
    return null;
  }

  async callGroqWithFallback(prompt) {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
      return null;
    }
    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
    for (const model of models) {
      try {
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: model,
            messages: [{ role: 'user', content: `${prompt}\nRespond ONLY in valid raw JSON format without markdown ticks.` }],
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 8000,
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (content) {
          return { content, model, service: 'Groq Cloud' };
        }
      } catch (err) {
        console.warn(`⚠️ [AI Engine] Groq model '${model}' failed:`, err.response?.data?.error?.message || err.message);
      }
    }
    return null;
  }

  async callLLMWithFallback(prompt) {
    let result = await this.callGeminiWithFallback(prompt);
    if (!result) {
      result = await this.callGroqWithFallback(prompt);
    }
    return result;
  }

  /**
   * Generates next interview question delegating to Python FastAPI microservice first,
   * with fallback to Node.js smart local engine if Python microservice is down.
   */
  async generateQuestion(session, candidateAnswerText = '', previousQuestionText = '', activeResume = null) {
    // 1. Delegate to Python FastAPI Service (Primary AI Microservice)
    const pythonResult = await pythonAiClient.generateQuestion(session, candidateAnswerText, previousQuestionText, activeResume);
    if (pythonResult && pythonResult.text) {
      console.log(`🐍 [AI Engine] Question generated via Python Microservice (${pythonResult.source || 'python'})`);
      return { text: pythonResult.text, idealAnswer: pythonResult.idealAnswer };
    }

    // 2. Node.js Direct LLM Fallback
    const prompt = `You are a Senior Principal Technical Interviewer at ${session.companyName} conducting a ${session.type} round for a ${session.jobRole} role (Difficulty: ${session.difficulty}).
Candidate Resume Skills: ${activeResume?.skills?.join(', ') || 'Software Architecture, API Design, System Optimization'}.
Previous Question: "${previousQuestionText}"
Candidate's Previous Answer: "${candidateAnswerText}"

Generate the next highly realistic, organic, and probing interview question. Return ONLY a JSON object in this exact format:
{
  "text": "Your question here",
  "idealAnswer": "What candidate should ideally cover"
}`;

    const llmResult = await this.callLLMWithFallback(prompt);
    if (llmResult) {
      try {
        const cleanJson = llmResult.content.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        console.log(`🤖 [AI Engine] Question generated via Node Direct LLM (${llmResult.service})`);
        return { text: parsed.text, idealAnswer: parsed.idealAnswer };
      } catch (e) {
        console.warn('[AI Engine] Failed to parse LLM response JSON:', e.message);
      }
    }

    console.log('⚡ [AI Engine] Question generated via Node Smart Heuristic Fallback Engine');
    return this.generateSmartLocalQuestion(session, candidateAnswerText, previousQuestionText, activeResume);
  }

  generateSmartLocalQuestion(session, candidateAnswerText, previousQuestionText, activeResume) {
    const { jobRole, companyName } = session;
    const skills =
      activeResume?.skills && activeResume.skills.length > 0
        ? activeResume.skills
        : ['Software Architecture', 'System Optimization', 'API Design', 'Database Management', 'Clean Code'];

    const targetSkill = skills[Math.floor(Math.random() * skills.length)];
    const text = (candidateAnswerText || '').trim();
    const words = text.split(/\s+/);

    const candidateTechTerms =
      text.match(
        /\b(react|node|express|mongodb|python|docker|aws|redis|api|cache|kafka|sql|microservices|graphql|typescript|jwt|security|async|hooks|redux|ci\/cd|pipeline)\b/gi
      ) || [];
    const mentionedTerm = candidateTechTerms.length > 0 ? candidateTechTerms[0] : targetSkill;

    if (!previousQuestionText) {
      return {
        text: `At ${companyName}, as a ${jobRole}, how do you leverage your experience in ${mentionedTerm} to design high-concurrency, scalable systems?`,
        idealAnswer: `Candidate should outline architectural patterns, caching, database indexing, and performance tradeoffs using ${mentionedTerm}.`,
      };
    }

    if (words.length < 25) {
      return {
        text: `In your response regarding ${mentionedTerm}, your answer was fairly high-level. At ${companyName}, as a ${jobRole}, how would you implement this step-by-step in production with robust error handling?`,
        idealAnswer: `Candidate should provide concrete implementation steps, exception handling, logging, and production safeguards for ${mentionedTerm}.`,
      };
    }

    return {
      text: `Building on your point about ${mentionedTerm}, how do you monitor for performance bottlenecks, handle failure degradation, and test edge cases when scaling for ${companyName}'s ${jobRole} requirements?`,
      idealAnswer: `Candidate should detail telemetry, load testing, unit/integration test suites, and graceful degradation strategies for ${mentionedTerm}.`,
    };
  }

  /**
   * Evaluates candidate answer via Python FastAPI first, with fallback to Node.js AI Engine
   */
  async evaluateAnswer(question, answerText) {
    const pythonResult = await pythonAiClient.evaluateAnswer(question, answerText);
    if (pythonResult && pythonResult.score !== undefined) {
      console.log(`🐍 [AI Engine] Answer evaluated via Python Microservice (${pythonResult.source || 'python'})`);
      return pythonResult;
    }

    const prompt = `You are a Principal AI Tech Interviewer evaluating a candidate's answer.
Question: "${question.text}"
Ideal Covered Topics: "${question.idealAnswer || ''}"
Candidate's Spoken/Written Answer: "${answerText}"

Evaluate the answer objectively on a scale of 0-100 across accuracy, completeness, depth, and relevance.
Return ONLY a valid JSON object in this exact format:
{
  "score": 85,
  "feedback": "Detailed constructive feedback explaining what was good and what was missing.",
  "factors": {
    "accuracy": 85,
    "completeness": 80,
    "depth": 85,
    "relevance": 90
  }
}`;

    const llmResult = await this.callLLMWithFallback(prompt);
    if (llmResult) {
      try {
        const cleanJson = llmResult.content.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (err) {
        console.warn('[AI Engine] LLM answer evaluation JSON parse failed:', err.message);
      }
    }

    return null;
  }

  /**
   * Generates dynamic AI Performance Report & Summary via Python FastAPI first, with fallback to Node.js
   */
  async generateSessionReportSummary(session, answers) {
    const pythonResult = await pythonAiClient.generateReportSummary(session, answers);
    if (pythonResult && pythonResult.overallSummary) {
      console.log(`🐍 [AI Engine] Report summary generated via Python Microservice (${pythonResult.source || 'python'})`);
      return pythonResult;
    }

    const qaSummaryText = answers
      .map(
        (ans, idx) =>
          `Question ${idx + 1}: ${ans.questionText}\nCandidate Answer: ${ans.answerText || 'No answer provided.'}\nEvaluation Score: ${
            ans.evaluation?.score || 'N/A'
          }`
      )
      .join('\n\n');

    const prompt = `You are a Senior Principal AI Technical Recruiter evaluating a completed mock interview session.
Candidate Role: ${session.jobRole} at ${session.companyName}
Round Type: ${session.type}
Difficulty: ${session.difficulty}

Session Answers & Evaluations:
${qaSummaryText}

Generate a comprehensive, tailored, and highly professional interview feedback report.
Return ONLY a valid JSON object in this exact format:
{
  "overallSummary": "A detailed 3-4 sentence evaluation of how the candidate performed, highlighting their domain knowledge, communication clarity, and technical readiness.",
  "strengths": [
    "Specific technical or architectural strength demonstrated in their answers",
    "Another concrete strength identified"
  ],
  "weaknesses": [
    "Specific area where their answers lacked depth, edge case coverage, or clarity",
    "Another specific area for improvement"
  ],
  "improvementPlan": "Actionable step-by-step guidance for the candidate to address their weaknesses before actual interviews."
}`;

    const llmResult = await this.callLLMWithFallback(prompt);
    if (llmResult) {
      try {
        const cleanJson = llmResult.content.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        console.log(`🤖 [AI Engine] Session report summary generated via Node Direct LLM (${llmResult.service})`);
        return parsed;
      } catch (err) {
        console.warn('[AI Engine] Session summary JSON parse failed:', err.message);
      }
    }

    return this.generateSmartLocalSummary(session, answers);
  }

  generateSmartLocalSummary(session, answers) {
    const scores = answers.map((a) => a.evaluation?.score || 70);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));

    const strengths = [];
    const weaknesses = [];

    if (avgScore >= 80) {
      strengths.push(`Demonstrated strong technical expertise and problem-solving skills for the ${session.jobRole} role.`);
      strengths.push(`Clear and structured communication aligned with ${session.companyName}'s engineering expectations.`);
    } else if (avgScore >= 60) {
      strengths.push(`Good grasp of core ${session.jobRole} concepts across the ${session.type} round.`);
      weaknesses.push('Answers could benefit from deeper architectural trade-off discussions and edge-case handling.');
    } else {
      weaknesses.push('Responses lacked technical specificity and production-level depth.');
      weaknesses.push('Recommend practicing response structuring using the STAR framework (Situation, Task, Action, Result).');
    }

    return {
      overallSummary: `The candidate completed a ${session.difficulty} level ${session.type.toUpperCase()} interview for ${session.jobRole} at ${session.companyName}. Based on ${answers.length} answered questions, the overall performance rating is ${avgScore}/100.`,
      strengths,
      weaknesses,
      improvementPlan: `1. Deep-dive into advanced ${session.jobRole} system design patterns.\n2. Practice elaborating on failure scenarios and scalability trade-offs.\n3. Conduct mock interviews focused on concise 2-minute technical summaries.`,
    };
  }

  async analyzeResumeWithAI(resumeText, targetRole = 'Software Engineer') {
    const pythonResult = await pythonAiClient.analyzeATS(resumeText, targetRole);
    if (pythonResult && pythonResult.atsScore) {
      return pythonResult;
    }

    const prompt = `You are a Senior Technical Recruiter & ATS AI Auditor.
Target Role / Domain: ${targetRole}

Resume Plain Text:
"""
${resumeText.substring(0, 4000)}
"""

Perform a comprehensive ATS audit & semantic resume evaluation.
Return ONLY a valid JSON object in this exact format:
{
  "atsScore": 82,
  "extractedSkills": ["React", "Node.js", "TypeScript", "MongoDB", "Docker", "AWS"],
  "strengths": [
    "Clear contact header and structured technical skills section",
    "Good project variety demonstrating full-stack engineering capabilities"
  ],
  "weaknesses": [
    "Lacks quantifiable achievements (e.g. percentages, performance gains, scale numbers)",
    "Cloud infrastructure details could be expanded"
  ],
  "suggestions": [
    "Incorporate quantifiable metrics into experience bullet points (e.g. 'Improved API response time by 40%')",
    "List explicit CI/CD or automated testing experience near technical skills"
  ]
}`;

    const llmResult = await this.callLLMWithFallback(prompt);
    if (llmResult) {
      try {
        const cleanJson = llmResult.content.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (err) {
        console.warn('[AI Engine] AI Resume ATS evaluation JSON parse failed:', err.message);
      }
    }

    return null;
  }
}

module.exports = new AIEngine();
