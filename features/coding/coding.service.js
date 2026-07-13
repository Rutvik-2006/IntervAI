const CodingQuestion = require('../../models/CodingQuestion');
const interviewRepository = require('../interview/interview.repository');
const pythonAiClient = require('../../utils/pythonAiClient');
const AppError = require('../../utils/appError');
const axios = require('axios');

class CodingService {
  async getOrCreateCodingQuestion(sessionId) {
    const session = await interviewRepository.findSessionById(sessionId);
    if (!session) {
      throw new AppError('Interview session not found.', 404);
    }

    let codingQ = await CodingQuestion.findOne({ sessionId });
    if (codingQ) {
      return codingQ;
    }

    // Call Python FastAPI microservice to generate tailored coding problem
    let pythonResult = null;
    try {
      const res = await axios.post('http://localhost:8000/api/coding/generate', { session }, { timeout: 15000 });
      if (res.data && res.data.title) {
        pythonResult = res.data;
      }
    } catch (err) {
      console.warn('⚠️ [Coding Service] Python FastAPI coding generator unavailable, using fallback:', err.message);
    }

    if (!pythonResult) {
      pythonResult = {
        title: 'Two Sum Target Index Pair',
        prompt: `At ${session.companyName}, as a ${session.jobRole}, your task is to optimize search efficiency. Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.`,
        difficulty: session.difficulty || 'medium',
        constraints: '2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, Time Complexity: O(N)',
        starterTemplates: {
          python: "def solution(nums, target):\n    # Write your solution here\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []",
          javascript: "function solution(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}",
          cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
          java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}"
        },
        sampleTestCases: [
          { id: 1, input: "nums = [2, 7, 11, 15], target = 9", expectedOutput: "[0, 1]", explanation: "nums[0] + nums[1] == 9" },
          { id: 2, input: "nums = [3, 2, 4], target = 6", expectedOutput: "[1, 2]", explanation: "nums[1] + nums[2] == 6" }
        ],
        hiddenTestCases: [
          { id: 101, input: "nums = [3, 3], target = 6", expectedOutput: "[0, 1]" }
        ]
      };
    }

    codingQ = await CodingQuestion.create({
      sessionId: session._id,
      title: pythonResult.title,
      prompt: pythonResult.prompt,
      difficulty: pythonResult.difficulty || session.difficulty,
      constraints: pythonResult.constraints,
      starterTemplates: pythonResult.starterTemplates,
      sampleTestCases: pythonResult.sampleTestCases,
      hiddenTestCases: pythonResult.hiddenTestCases,
    });

    return codingQ;
  }

  async executeCode(sourceCode, language, testCases) {
    try {
      const res = await axios.post('http://localhost:8000/api/coding/execute', {
        source_code: sourceCode,
        language: language || 'python',
        test_cases: testCases || [],
      }, { timeout: 10000 });

      return res.data;
    } catch (err) {
      console.error('❌ Code execution error:', err.message);
      return {
        success: false,
        error: 'Execution engine error or timeout.',
        testResults: [],
        passCount: 0,
        totalCount: testCases ? testCases.length : 0
      };
    }
  }

  async evaluateAndSubmit(sessionId, sourceCode, language, passCount, totalCount) {
    const session = await interviewRepository.findSessionById(sessionId);
    if (!session) {
      throw new AppError('Interview session not found.', 404);
    }

    const codingQ = await CodingQuestion.findOne({ sessionId });
    const problemTitle = codingQ ? codingQ.title : 'Algorithmic Problem';

    let evaluation = null;
    try {
      const res = await axios.post('http://localhost:8000/api/coding/evaluate', {
        problem_title: problemTitle,
        source_code: sourceCode,
        language: language || 'python',
        pass_count: passCount,
        total_count: totalCount,
      }, { timeout: 15000 });

      if (res.data) {
        evaluation = res.data;
      }
    } catch (err) {
      console.warn('⚠️ [Coding Service] Python code evaluator failed:', err.message);
    }

    const isZeroScore = !passCount || passCount === 0 || !sourceCode || sourceCode.trim().length < 5;

    if (isZeroScore || !evaluation) {
      const passRate = (passCount && totalCount > 0) ? (passCount / totalCount) : 0;
      evaluation = {
        score: isZeroScore ? 0 : Math.round(passRate * 100),
        timeComplexity: isZeroScore ? 'N/A' : (evaluation?.timeComplexity || 'O(N)'),
        spaceComplexity: isZeroScore ? 'N/A' : (evaluation?.spaceComplexity || 'O(N)'),
        codeQuality: isZeroScore ? 'No solution code submitted.' : (evaluation?.codeQuality || 'Code executed cleanly.'),
        edgeCasesCovered: false,
        feedback: isZeroScore ? 'No working solution was submitted for evaluation.' : (evaluation?.feedback || 'Solution submitted.'),
        suggestions: isZeroScore ? ['1. Write working algorithmic code.', '2. Test solutions against sample inputs before submitting.'] : (evaluation?.suggestions || ['Review boundary constraints.'])
      };
    }

    const finalScore = isZeroScore ? 0 : (typeof evaluation.score === 'number' ? evaluation.score : 0);

    session.scores = {
      overall: finalScore,
      technical: finalScore,
      communication: isZeroScore ? 0 : 80,
      confidence: isZeroScore ? 0 : 80,
      coding: finalScore,
    };
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    // Create Report document in MongoDB for Report View
    const Report = require('../../models/Report');
    let report = await Report.findOne({ sessionId });
    if (!report) {
      report = await Report.create({
        userId: session.userId,
        sessionId: session._id,
        overallSummary: isZeroScore
          ? `The candidate completed a technical Coding Round for the ${session.jobRole} position at ${session.companyName}, receiving an overall score of 0/100 as no code solution was submitted or zero test cases passed.`
          : `The candidate completed a technical Coding Round for the ${session.jobRole} position at ${session.companyName}. Solution achieved a score of ${finalScore}/100 with ${evaluation.timeComplexity || 'O(N)'} time complexity.`,
        strengths: isZeroScore ? [] : (Array.isArray(evaluation.strengths) && evaluation.strengths.length > 0 ? evaluation.strengths : [
          `Demonstrated algorithmic proficiency in ${language || 'Python'}.`,
          `Achieved ${passCount} / ${totalCount} sample test cases passed.`,
          `Time complexity achieved: ${evaluation.timeComplexity || 'O(N)'}.`
        ]),
        weaknesses: isZeroScore ? [
          "No solution code was written or zero sample test cases passed during the coding round.",
          "Must write working algorithmic code to pass test cases and earn score points."
        ] : (Array.isArray(evaluation.weaknesses) && evaluation.weaknesses.length > 0 ? evaluation.weaknesses : [
          evaluation.feedback || 'Consider handling large input boundary constraints and memory optimization.'
        ]),
        improvementPlan: Array.isArray(evaluation.suggestions) ? evaluation.suggestions.join('\n') : (evaluation.suggestions || '1. Practice boundary edge cases.\n2. Optimize space complexity.'),
        cheatingFlagged: false
      });
    }

    return {
      session,
      evaluation,
      report,
      codingQuestion: codingQ
    };
  }
}

module.exports = new CodingService();
