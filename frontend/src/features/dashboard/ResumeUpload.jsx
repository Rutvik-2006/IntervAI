import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import API from '../../api/axios';
import Button from '../../components/common/Button';

const ResumeUpload = () => {
  const [activeResume, setActiveResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  const fetchActiveResume = async () => {
    try {
      setLoading(true);
      const response = await API.get('/resumes/active');
      if (response.data && response.data.data?.resume) {
        setActiveResume(response.data.data.resume);
      } else {
        setActiveResume(null);
      }
    } catch (err) {
      console.error('Failed to fetch active resume:', err);
      setActiveResume(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveResume();
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    try {
      setUploading(true);
      setError(null);
      const response = await API.postForm('/resumes/upload', formData);

      if (response.data && response.data.data?.resume) {
        setActiveResume(response.data.data.resume);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload and process resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 p-6 text-slate-100">
      {/* Header Section */}
      <div className="text-left space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <FileText className="text-indigo-400" size={32} />
          Resume Management & ATS Analyzer
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Upload your resume in PDF format to parse your technical skills, evaluate ATS compatibility, and tailor personalized AI mock interviews.
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400 text-sm">
          <AlertCircle className="shrink-0" size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-xl">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
          <p className="text-sm text-slate-400">Loading active resume profile...</p>
        </div>
      ) : activeResume ? (
        /* Results & Analysis Dashboard */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ATS Score Card */}
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-xl flex flex-col justify-between items-center text-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                ATS Compatibility Score
              </span>
              <div
                className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center my-4 ${getScoreColor(
                  activeResume.atsScore
                )}`}
              >
                <span className="text-4xl font-extrabold">{activeResume.atsScore}</span>
                <span className="text-xs opacity-75">/ 100</span>
              </div>
              <p className="text-xs text-slate-400">
                Calculated using ATS keyword parsing & structural formatting metrics.
              </p>
            </div>

            {/* Resume File & Quick Details Card */}
            <div className="md:col-span-2 rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
                    Active Resume
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={12} className="mr-1" /> Active
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 truncate">
                  <FileText className="text-indigo-400 shrink-0" size={20} />
                  {activeResume.fileName}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Uploaded on {new Date(activeResume.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Skills Extracted */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400">Extracted Skills ({activeResume.skills?.length || 0}):</span>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                  {activeResume.skills && activeResume.skills.length > 0 ? (
                    activeResume.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No explicit keywords detected.</span>
                  )}
                </div>
              </div>

              {/* Re-upload Action */}
              <div className="pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                  accept=".pdf"
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploading}
                  variant="secondary"
                  className="w-full text-xs !py-2 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} /> Upload New Resume Version
                </Button>
              </div>
            </div>
          </div>

          {/* Feedback & Recommendations Breakdown */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="text-amber-400" size={18} /> Detailed ATS Feedback
            </h4>
            <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-900 text-sm text-slate-300 space-y-3 leading-relaxed whitespace-pre-line font-mono">
              {activeResume.atsFeedback}
            </div>
          </div>
        </div>
      ) : (
        /* Upload Drag & Drop Dropzone */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
            accept=".pdf"
            className="hidden"
          />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 mb-4">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <UploadCloud className="h-8 w-8" />
            )}
          </div>

          <h3 className="text-lg font-semibold text-white mb-1">
            {uploading ? 'Parsing & Analyzing Resume...' : 'Upload your Resume PDF'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
            Drag and drop your PDF file here, or click to browse. Max file size 5MB.
          </p>

          <Button
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
            className="w-auto px-6"
          >
            Select PDF File
          </Button>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
