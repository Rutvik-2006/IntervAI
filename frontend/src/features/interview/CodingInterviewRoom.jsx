import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Code,
  Play,
  CheckCircle,
  XCircle,
  Terminal,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Loader2,
  Cpu,
  FileCode,
  Check,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import API from '../../api/axios';
import WebcamMonitor from './WebcamMonitor';

export default function CodingInterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [executing, setExecuting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [activeTab, setActiveTab] = useState('console');

  useEffect(() => {
    fetchCodingQuestion();
  }, [sessionId]);

  const fetchCodingQuestion = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/coding/session/${sessionId}`);
      const q = res.data?.data?.question;
      setQuestion(q);
      if (q?.starterTemplates && q.starterTemplates[language]) {
        setCode(q.starterTemplates[language]);
      } else {
        setCode(q?.starterTemplates?.python || '# Write solution here\n');
      }
    } catch (err) {
      console.error('Failed to fetch coding question:', err);
      const fallback = {
        title: 'Two Sum Target Index Pair',
        prompt: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
        constraints: '2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, Time Target: O(N)',
        difficulty: 'medium',
        starterTemplates: {
          python: "def solution(nums, target):\n    # Write your solution here\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []",
          javascript: "function solution(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}",
          cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
          java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}"
        },
        sampleTestCases: [
          { id: 1, input: "[2, 7, 11, 15], 9", expectedOutput: "[0, 1]", explanation: "nums[0] + nums[1] == 9" },
          { id: 2, input: "[3, 2, 4], 6", expectedOutput: "[1, 2]", explanation: "nums[1] + nums[2] == 6" }
        ]
      };
      setQuestion(fallback);
      setCode(fallback.starterTemplates[language] || '');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (question && question.starterTemplates && question.starterTemplates[newLang]) {
      setCode(question.starterTemplates[newLang]);
    }
  };

  const handleResetCode = () => {
    if (question && question.starterTemplates && question.starterTemplates[language]) {
      setCode(question.starterTemplates[language]);
    }
  };

  const handleRunCode = async () => {
    if (!question) return;
    try {
      setExecuting(true);
      setActiveTab('console');
      const testCasesToRun = (question.sampleTestCases && question.sampleTestCases.length > 0)
        ? question.sampleTestCases
        : [
            { id: 1, input: "[2, 7, 11, 15], 9", expectedOutput: "[0, 1]" },
            { id: 2, input: "[3, 2, 4], 6", expectedOutput: "[1, 2]" }
          ];

      const res = await API.post('/coding/execute', {
        sourceCode: code,
        language,
        testCases: testCasesToRun,
      });

      const resultObj = res.data?.data?.result || res.data?.result || res.data;
      setExecutionResult(resultObj);
    } catch (err) {
      console.error('Code execution failed:', err);
      setExecutionResult({
        success: false,
        error: err.response?.data?.message || 'Execution service offline or timed out.',
        passCount: 0,
        totalCount: question?.sampleTestCases?.length || 2,
        testResults: []
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmitSolution = async () => {
    try {
      setSubmitting(true);
      const passCount = typeof executionResult?.passCount === 'number' ? executionResult.passCount : 0;
      const totalCount = question?.sampleTestCases?.length || 2;

      await API.post(`/coding/session/${sessionId}/submit`, {
        sourceCode: code,
        language,
        passCount,
        totalCount,
      });
      navigate(`/interview/${sessionId}/report`);
    } catch (err) {
      console.error('Solution submission failed:', err);
      navigate(`/interview/${sessionId}/report`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-mono">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin text-cyan-400" size={36} />
          <p className="text-sm text-slate-400">Initializing VS Code Monaco Editor Environment...</p>
        </div>
      </div>
    );
  }

  const monacoLanguage = language === 'cpp' ? 'cpp' : language;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top VS Code Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <FileCode size={18} className="text-cyan-400" />
            <h1 className="text-sm font-semibold text-white tracking-wide font-mono">
              {question?.title || 'Coding Problem'}
            </h1>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-widest border border-emerald-500/20">
              {question?.difficulty || 'Medium'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunCode}
            disabled={executing || submitting}
            className="flex items-center space-x-1.5 rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-all border border-slate-700 disabled:opacity-50"
          >
            {executing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="text-emerald-400 fill-emerald-400" />}
            <span>Run Sample Tests</span>
          </button>
          <button
            onClick={handleSubmitSolution}
            disabled={submitting}
            className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            <span>Submit Solution</span>
          </button>
        </div>
      </header>

      {/* Main Split Layout: Left Problem Statement & Right Monaco Code Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Problem Statement & Test Inputs */}
        <div className="w-1/2 border-r border-slate-800 bg-slate-950 p-5 overflow-y-auto space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{question?.title}</h2>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs font-mono text-slate-300 leading-relaxed space-y-2">
              <span className="text-slate-400 uppercase text-[10px] tracking-wider block font-semibold">Constraints & Target Complexity</span>
              <p className="text-cyan-300">{question?.constraints || 'Time Target: O(N)'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Problem Description</h3>
            <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {question?.prompt}
            </div>
          </div>

          {/* Sample Test Cases List */}
          <div className="space-y-3 pt-4 border-t border-slate-900">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sample Example Test Cases</h3>
            <div className="space-y-3">
              {question?.sampleTestCases?.map((tc, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Example #{idx + 1}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Input:</span>
                    <code className="text-cyan-300 font-bold">{tc.input}</code>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Expected Output:</span>
                    <code className="text-emerald-400 font-bold">{tc.expectedOutput}</code>
                  </div>
                  {tc.explanation && (
                    <p className="text-[11px] text-slate-400 font-sans italic pt-1">{tc.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Monaco Code Editor & Console Tabs */}
        <div className="flex w-1/2 flex-col bg-slate-950">
          {/* Language Selector & Controls Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-medium font-mono text-[11px]">Language:</span>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
              >
                <option value="python">Python 3</option>
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="cpp">C++ (GCC)</option>
                <option value="java">Java 17</option>
              </select>
            </div>

            <button
              onClick={handleResetCode}
              className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
              title="Reset Code Template"
            >
              <RotateCcw size={13} />
              <span>Reset Template</span>
            </button>
          </div>

          {/* VS Code Monaco Editor Engine */}
          <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={monacoLanguage}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                fontSize: 13,
                fontFamily: 'Fira Code, Menlo, Monaco, Consolas, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: true,
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                cursorBlinking: 'smooth',
                padding: { top: 12 }
              }}
            />
          </div>

          {/* Bottom Execution Console & Results Panel */}
          <div className="h-48 border-t border-slate-800 bg-slate-900/90 flex flex-col font-mono">
            {/* Console Tab Headers */}
            <div className="flex items-center border-b border-slate-800 px-3 bg-slate-950 text-xs">
              <button
                onClick={() => setActiveTab('console')}
                className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'console'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal size={14} />
                <span>Test Console</span>
              </button>
            </div>

            {/* Execution Console Output */}
            <div className="flex-1 p-3 overflow-y-auto text-xs space-y-2">
              {!executionResult && !executing && (
                <div className="flex h-full items-center justify-center text-slate-500 text-[11px]">
                  Click "Run Sample Tests" to execute your solution against test cases.
                </div>
              )}

              {executing && (
                <div className="flex items-center space-x-2 text-cyan-400">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Executing code in isolated process sandbox...</span>
                </div>
              )}

              {executionResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="font-bold text-slate-300">
                      Results: <span className={executionResult.passCount === executionResult.totalCount ? 'text-emerald-400' : 'text-amber-400'}>
                        {executionResult.passCount} / {executionResult.totalCount} Passed
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-500">Execution Time: {executionResult.executionTimeMs || 0} ms</span>
                  </div>

                  {executionResult.error && (
                    <div className="rounded border border-rose-500/20 bg-rose-500/10 p-2 text-rose-400 text-[11px]">
                      ⚠️ {executionResult.error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {executionResult.testResults?.map((res, idx) => (
                      <div key={idx} className="flex items-start justify-between rounded border border-slate-800 bg-slate-950 p-2">
                        <div className="space-y-0.5 w-full">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {res.passed ? (
                                <CheckCircle size={13} className="text-emerald-400" />
                              ) : (
                                <XCircle size={13} className="text-rose-400" />
                              )}
                              <span className="font-semibold text-slate-200">Test Case #{res.testCaseId}</span>
                            </div>
                            <span className={res.passed ? 'text-[10px] text-emerald-400 font-bold' : 'text-[10px] text-rose-400 font-bold'}>
                              {res.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Input: <code className="text-slate-300">{res.input}</code></p>
                          <p className="text-[11px] text-slate-400">Expected: <code className="text-emerald-400">{res.expectedOutput}</code> | Actual: <code className={res.passed ? 'text-emerald-400' : 'text-rose-400'}>{res.actualOutput}</code></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Proctoring Webcam Feed */}
      <WebcamMonitor sessionId={sessionId} />
    </div>
  );
}
