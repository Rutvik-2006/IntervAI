import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, CheckCircle, AlertTriangle, ArrowLeft, Loader2, Sparkles, HelpCircle, Target } from 'lucide-react';
import API from '../../api/axios';
import Button from '../../components/common/Button';

const InterviewReportView = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [report, setReport] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/interviews/${sessionId}/report`);
      if (response.data && response.data.data) {
        setSession(response.data.data.session);
        setReport(response.data.data.report);
        setAnswers(response.data.data.answers || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch interview report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium text-slate-400">Generating AI Evaluation Report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 text-center px-4">
        <h2 className="text-2xl font-bold text-rose-500 mb-2">Report Unavailable</h2>
        <p className="text-slate-400 text-sm mb-6">{error || 'Could not load interview session results.'}</p>
        <Button onClick={() => navigate('/dashboard')} className="!w-auto px-6">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const overallScore = session?.scores?.overall || 75;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>

          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="text-amber-400" size={20} /> Interview Performance Report
          </h1>

          <Button onClick={() => navigate('/dashboard')} variant="secondary" className="!py-1.5 !px-4 text-xs">
            Done
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-6 space-y-8">
        {/* Session Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Score */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-xl flex flex-col justify-between items-center text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Overall Performance
            </span>
            <div className="w-32 h-32 rounded-full border-4 border-indigo-500/40 bg-indigo-500/10 flex flex-col items-center justify-center my-4 text-indigo-400">
              <span className="text-4xl font-extrabold">{overallScore}</span>
              <span className="text-xs opacity-75">/ 100</span>
            </div>
            <p className="text-xs text-slate-400 capitalize">
              {session?.companyName} • {session?.type} Round ({session?.jobRole})
            </p>
          </div>

          {/* Factor Scores Grid */}
          <div className="md:col-span-2 rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-xl flex flex-col justify-between space-y-4">
            <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">
              Evaluation Metrics Breakdown
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400 font-medium">Technical Accuracy</span>
                <p className="text-2xl font-bold text-white mt-1">{session?.scores?.technical || 75}%</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400 font-medium">Communication Clarity</span>
                <p className="text-2xl font-bold text-white mt-1">{session?.scores?.communication || 80}%</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400 font-medium">Technical Depth</span>
                <p className="text-2xl font-bold text-white mt-1">{session?.scores?.confidence || 70}%</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400 font-medium">Questions Answered</span>
                <p className="text-2xl font-bold text-white mt-1">{answers.length} / {session?.totalQuestions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & Weaknesses Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-6 backdrop-blur-xl space-y-3">
            <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle size={18} /> Key Strengths
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {report.strengths.map((st, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span>{st}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-6 backdrop-blur-xl space-y-3">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <AlertTriangle size={18} /> Areas for Improvement
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {report.weaknesses.map((wk, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>{wk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actionable Improvement Plan */}
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-xl space-y-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="text-indigo-400" size={18} /> Recommended Improvement Roadmap
          </h3>
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 text-sm text-slate-300 font-mono whitespace-pre-line leading-relaxed">
            {report.improvementPlan}
          </div>
        </div>

        {/* Question by Question Response Breakdown */}
        <div className="space-y-4 pt-4 border-t border-slate-900">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="text-indigo-400" size={20} /> Question Breakdown & AI Feedback
          </h3>

          <div className="space-y-4">
            {answers.map((ans, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>Question #{idx + 1}</span>
                  <span className="px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Score: {ans.evaluation?.score || 70}/100
                  </span>
                </div>

                <p className="text-sm font-bold text-white leading-relaxed">
                  {ans.questionId?.text || `Question #${idx + 1}`}
                </p>

                <div className="rounded-xl border border-slate-900 bg-slate-950 p-3.5 text-xs text-slate-300 leading-relaxed font-mono">
                  <strong className="text-slate-400 block mb-1 font-sans">Your Submitted Answer:</strong>
                  {ans.candidateAnswer}
                </div>

                {ans.evaluation?.feedback && (
                  <p className="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    💡 <strong>AI Feedback:</strong> {ans.evaluation.feedback}
                  </p>
                )}

                {/* Python Microservice Metrics UI Display */}
                {ans.evaluation?.pythonVoiceMetrics && (
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono">
                    <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                      ⚡ Speech WPM: {ans.evaluation.pythonVoiceMetrics.wpm}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-teal-500/10 border border-teal-500/30 text-teal-300">
                      🎯 Fluency Score: {ans.evaluation.pythonVoiceMetrics.fluency_score}/100
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      💬 Filler Words: {ans.evaluation.pythonVoiceMetrics.filler_count}
                    </span>
                    {ans.evaluation?.pythonVisionMetrics && (
                      <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                        👁️ Eye Contact: {ans.evaluation.pythonVisionMetrics.eye_contact_pct}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default InterviewReportView;
