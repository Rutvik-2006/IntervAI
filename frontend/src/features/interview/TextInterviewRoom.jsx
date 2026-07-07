import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bot, User, Send, ArrowLeft, Loader2, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import API from '../../api/axios';
import Button from '../../components/common/Button';

const TextInterviewRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [error, setError] = useState(null);

  const fetchCurrentQuestion = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/interviews/${sessionId}/current-question`);
      if (response.data && response.data.data) {
        setSession(response.data.data.session);
        setCurrentQuestion(response.data.data.question);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load current interview question.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentQuestion();
  }, [sessionId]);

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!candidateAnswer.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await API.post(`/interviews/${sessionId}/submit-answer`, {
        questionId: currentQuestion._id,
        candidateAnswer,
      });

      if (response.data && response.data.data) {
        const { isCompleted, nextQuestion, answer } = response.data.data;
        setLastEvaluation(answer.evaluation);

        if (isCompleted) {
          navigate(`/interview/${sessionId}/report`, { replace: true });
        } else {
          setCandidateAnswer('');
          setCurrentQuestion(nextQuestion);
          setSession((prev) => ({
            ...prev,
            currentQuestionIndex: prev.currentQuestionIndex + 1,
          }));
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to evaluate answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium text-slate-400">Loading AI Interview Room...</p>
      </div>
    );
  }

  const progressPercent = session
    ? Math.round(((session.currentQuestionIndex + 1) / session.totalQuestions) * 100)
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Room Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>

          <div className="text-center">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
              {session?.companyName} • {session?.type} Round
            </span>
            <h2 className="text-base font-bold text-white">{session?.jobRole}</h2>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-400 font-medium">
            <span>
              Question <strong className="text-white">{session?.currentQuestionIndex + 1}</strong> of{' '}
              {session?.totalQuestions}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 h-1 absolute bottom-0 left-0">
          <div
            className="bg-indigo-500 h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </header>

      {/* Main Interview Chat Interface */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-6 space-y-6">
        {error && (
          <div className="flex items-center space-x-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400 text-sm">
            <ShieldAlert className="shrink-0" size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* AI Question Message */}
        {currentQuestion && (
          <div className="flex items-start space-x-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Bot size={20} />
            </div>
            <div className="flex-1 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-6 backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                <span>AI Interviewer</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                  Difficulty: {currentQuestion.difficulty}
                </span>
              </div>
              <p className="text-base text-slate-100 leading-relaxed font-medium">
                {currentQuestion.text}
              </p>
            </div>
          </div>
        )}

        {/* Previous Answer AI Feedback Badge */}
        {lastEvaluation && (
          <div className="flex items-center space-x-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400 text-xs font-medium">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>
              Previous Answer Evaluated: <strong>{lastEvaluation.score}/100</strong>. {lastEvaluation.feedback}
            </span>
          </div>
        )}

        {/* Candidate Response Input Area */}
        <form onSubmit={handleSubmitAnswer} className="mt-auto space-y-4 pt-4">
          <div className="relative rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 text-slate-300">
                <User size={14} className="text-indigo-400" /> Your Technical Answer
              </span>
              <span>{candidateAnswer.length} characters</span>
            </div>

            <textarea
              rows={6}
              value={candidateAnswer}
              onChange={(e) => setCandidateAnswer(e.target.value)}
              placeholder="Type your structured answer here. Include relevant concepts, architectural choices, and impact metrics..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none resize-none leading-relaxed"
              required
            ></textarea>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <Button
              type="submit"
              loading={submitting}
              disabled={!candidateAnswer.trim()}
              className="w-auto px-8 flex items-center justify-center gap-2"
            >
              <Send size={16} /> Submit & Continue
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default TextInterviewRoom;
