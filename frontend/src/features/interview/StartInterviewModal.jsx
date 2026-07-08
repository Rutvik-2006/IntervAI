import React, { useState } from 'react';
import { X, Sparkles, Building2, Briefcase, BarChart2, Layers, Volume2, MessageSquare } from 'lucide-react';
import Button from '../../components/common/Button';

const StartInterviewModal = ({ isOpen, onClose, onStart, loading, error }) => {
  const [formData, setFormData] = useState({
    jobRole: 'Software Engineer',
    companyName: 'Google',
    type: 'technical',
    mode: 'text',
    difficulty: 'medium',
    totalQuestions: 5,
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-2">
            <Sparkles className="text-indigo-400" size={22} />
            <h3 className="text-xl font-bold text-white">Configure AI Mock Interview</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Interview Mode Selector (Text vs Voice) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Interview Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, mode: 'text' }))}
                className={`flex items-center justify-center space-x-2 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  formData.mode === 'text'
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 shadow-md'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <MessageSquare size={16} />
                <span>Text Interview</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, mode: 'voice' }))}
                className={`flex items-center justify-center space-x-2 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  formData.mode === 'voice'
                    ? 'border-emerald-500 bg-emerald-600/20 text-emerald-300 shadow-md'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Volume2 size={16} />
                <span>Voice (Whisper AI)</span>
              </button>
            </div>
          </div>

          {/* Target Company */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={14} /> Target Company
            </label>
            <select
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="Google">Google</option>
              <option value="Amazon">Amazon</option>
              <option value="Microsoft">Microsoft</option>
              <option value="Meta">Meta</option>
              <option value="High-Growth Startup">High-Growth Startup</option>
              <option value="Enterprise Tech">Enterprise Tech</option>
            </select>
          </div>

          {/* Target Job Role */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase size={14} /> Target Job Role
            </label>
            <input
              type="text"
              name="jobRole"
              value={formData.jobRole}
              onChange={handleChange}
              placeholder="e.g. Frontend Engineer, Backend Developer"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Interview Type / Round */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} /> Interview Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="technical">Technical Round</option>
                <option value="hr">HR Round</option>
                <option value="behavioral">Behavioral (STAR)</option>
                <option value="system_design">System Design</option>
              </select>
            </div>

            {/* Difficulty Level */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 size={14} /> Difficulty Level
              </label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800 mt-6">
            <Button type="button" variant="secondary" onClick={onClose} className="!w-auto px-5">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="!w-auto px-6">
              Start Session
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StartInterviewModal;
