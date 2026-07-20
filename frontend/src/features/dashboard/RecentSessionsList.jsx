import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import Button from '../../components/common/Button';
import { Play, FileText, Mic, CheckCircle2, Clock, ChevronRight, Award, Code } from 'lucide-react';

const RecentSessionsList = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await API.get('/interviews/history');
      if (res.data?.data?.sessions) {
        setSessions(res.data.data.sessions);
      }
    } catch (err) {
      console.error('Failed to fetch interview history:', err);
      setError('Could not load recent interview sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-xl animate-pulse space-y-4">
        <div className="h-4 bg-slate-800 rounded w-1/4"></div>
        <div className="h-16 bg-slate-800/50 rounded-xl"></div>
        <div className="h-16 bg-slate-800/50 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-xl space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="text-indigo-400" size={20} /> Recent Interview Sessions & AI Reports
        </h2>
        <span className="text-xs text-slate-400 font-mono">
          Total Sessions: {sessions.length}
        </span>
      </div>

      {error && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{error}</p>
      )}

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center space-y-3">
          <Clock className="mx-auto text-slate-500" size={32} />
          <p className="text-sm font-medium text-slate-300">No mock interview sessions found.</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Start a new Text, Voice, or Coding interview session to receive detailed AI evaluation reports!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((sess) => {
            const isCompleted = sess.status === 'completed';
            const overallScore = typeof sess.scores?.overall === 'number' ? sess.scores.overall : 0;
            const isVoice = sess.mode === 'voice';
            const isCoding = sess.mode === 'coding';

            return (
              <div
                key={sess._id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{sess.companyName}</span>
                    <span className="text-xs text-slate-400">• {sess.jobRole}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${
                        isCoding
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          : isVoice
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                      }`}
                    >
                      {isCoding ? <Code size={11} /> : isVoice ? <Mic size={11} /> : <FileText size={11} />}
                      {isCoding ? 'Coding Round' : isVoice ? 'Voice Mode' : 'Text Mode'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="capitalize font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {sess.type} ({sess.difficulty})
                    </span>
                    <span>
                      {new Date(sess.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                  {isCompleted ? (
                    <>
                      <div className="text-right mr-2">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 block">AI Score</span>
                        <span className="text-sm font-bold text-emerald-400">{overallScore} / 100</span>
                      </div>
                      <Button
                        onClick={() => navigate(`/interview/${sess._id}/report`)}
                        className="!py-1.5 !px-4 text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1"
                      >
                        <FileText size={14} /> View AI Report
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() =>
                        navigate(
                          isCoding
                            ? `/interview/${sess._id}?mode=coding`
                            : isVoice
                            ? `/interview/${sess._id}?mode=voice`
                            : `/interview/${sess._id}`
                        )
                      }
                      variant="secondary"
                      className="!py-1.5 !px-4 text-xs flex items-center gap-1"
                    >
                      <Play size={14} /> Resume Session
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentSessionsList;
