import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bot, Mic, MicOff, Send, ArrowLeft, Loader2, Sparkles, CheckCircle2, ShieldAlert, Volume2, RefreshCw, Wand2 } from 'lucide-react';
import API from '../../api/axios';
import Button from '../../components/common/Button';
import WebcamMonitor from './WebcamMonitor';

const VoiceInterviewRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transcribingAudio, setTranscribingAudio] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [lastVoiceMetrics, setLastVoiceMetrics] = useState(null);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

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

  // Clean Web Speech API Listener (Fixed duplicate word repetition)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscribedText(fullTranscript.trim());
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access blocked. Please allow microphone access in your browser address bar.');
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingTime(0);

      // Setup Local Audio Visualizer
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.5;
        audioContextRef.current = audioContext;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          if (!isRecordingRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          const maxVal = Math.max(...dataArray);
          const peakVolume = Math.min(100, Math.round((maxVal / 255.0) * 100));
          setAudioVolume(peakVolume);
          animFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      } catch (e) {
        console.warn('Local Audio Context visualizer notice:', e.message);
      }

      // MediaRecorder setup for Brave Browser & fallback audio capture
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);

      // Start Web Speech API if supported by browser
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone permission error:', err);
      setError('Microphone access denied or missing. Please click the mic icon in your browser URL bar to allow microphone access.');
    }
  };

  const stopRecordingAndTranscribe = async () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setAudioVolume(0);

    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }

    // Auto Transcribe for Brave Browser if browser speech didn't populate text
    setTimeout(async () => {
      if (!transcribedText.trim() && audioChunksRef.current.length > 0) {
        try {
          setTranscribingAudio(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', audioBlob, 'candidate_voice.webm');

          const pyRes = await fetch('http://localhost:8000/api/voice/transcribe', {
            method: 'POST',
            body: formData,
          });
          const pyData = await pyRes.json();
          if (pyData && pyData.transcription) {
            setTranscribedText(pyData.transcription);
          }
        } catch (err) {
          console.warn('Python STT notice:', err);
        } finally {
          setTranscribingAudio(false);
        }
      }
    }, 300);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecordingAndTranscribe();
    } else {
      startRecording();
    }
  };

  const handleManualTranscribe = async () => {
    if (audioChunksRef.current.length === 0) return;
    try {
      setTranscribingAudio(true);
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', audioBlob, 'candidate_voice.webm');

      const pyRes = await fetch('http://localhost:8000/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });
      const pyData = await pyRes.json();
      if (pyData && pyData.transcription) {
        setTranscribedText(pyData.transcription);
      }
    } catch (err) {
      console.warn('Python STT notice:', err);
    } finally {
      setTranscribingAudio(false);
    }
  };

  const handleSubmitAnswer = async (e) => {
    if (e) e.preventDefault();

    if (isRecording) stopRecordingAndTranscribe();

    let finalText = transcribedText.trim();

    if (!finalText && audioChunksRef.current.length > 0) {
      try {
        setTranscribingAudio(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'candidate_voice.webm');

        const pyRes = await fetch('http://localhost:8000/api/voice/transcribe', {
          method: 'POST',
          body: formData,
        });
        const pyData = await pyRes.json();
        if (pyData && pyData.transcription) {
          finalText = pyData.transcription;
          setTranscribedText(finalText);
        }
      } catch (err) {
        console.warn('Python Audio Transcribe notice:', err);
      } finally {
        setTranscribingAudio(false);
      }
    }

    if (!finalText) {
      setError('Please click the microphone button, speak into your mic, or type your response in the box below before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await API.post(`/interviews/${sessionId}/submit-answer`, {
        questionId: currentQuestion._id,
        candidateAnswer: finalText,
        duration: recordingTime || 30.0,
      });

      if (response.data && response.data.data) {
        const { isCompleted, nextQuestion, answer } = response.data.data;
        setLastEvaluation(answer.evaluation);
        if (answer.evaluation?.pythonVoiceMetrics) {
          setLastVoiceMetrics(answer.evaluation.pythonVoiceMetrics);
        }

        if (isCompleted) {
          navigate(`/interview/${sessionId}/report`, { replace: true });
        } else {
          setTranscribedText('');
          setRecordingTime(0);
          audioChunksRef.current = [];
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
        <p className="text-sm font-medium text-slate-400">Loading AI Voice Interview Room...</p>
      </div>
    );
  }

  // Exact WPM formula: (word count / duration in seconds) * 60
  const words = transcribedText.trim() ? transcribedText.trim().split(/\s+/).length : 0;
  const effectiveSec = Math.max(recordingTime, 1);
  const rawWpm = words > 0 ? Math.round((words / effectiveSec) * 60) : 0;
  const liveWpm = rawWpm > 0 ? Math.min(200, Math.max(40, rawWpm)) : 0;

  const progressPercent = session
    ? Math.round(((session.currentQuestionIndex + 1) / session.totalQuestions) * 100)
    : 0;

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

          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-widest">
              <Volume2 size={14} /> Voice Mode • Speech Analytics Engine
            </span>
            <h2 className="text-base font-bold text-white">{session?.jobRole} ({session?.companyName})</h2>
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
            className="bg-emerald-500 h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </header>

      {/* Main Container */}
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <Bot size={20} />
            </div>
            <div className="flex-1 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-6 backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                <span>AI Voice Interviewer</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Difficulty: {currentQuestion.difficulty}
                </span>
              </div>
              <p className="text-base text-slate-100 leading-relaxed font-medium">
                {currentQuestion.text}
              </p>
            </div>
          </div>
        )}

        {/* Previous Answer Metrics */}
        {lastEvaluation && (
          <div className="flex flex-col space-y-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-300 text-xs">
            <div className="flex items-center space-x-2 font-semibold text-emerald-400">
              <CheckCircle2 size={16} />
              <span>Previous Answer Score: {lastEvaluation.score}/100</span>
            </div>
            <p className="text-slate-300">{lastEvaluation.feedback}</p>
            {lastVoiceMetrics && (
              <div className="flex items-center space-x-4 pt-2 border-t border-emerald-500/20 text-[11px]">
                <span>WPM: <strong className="text-white">{lastVoiceMetrics.wpm}</strong></span>
                <span>Fillers Detected: <strong className="text-white">{lastVoiceMetrics.filler_count}</strong></span>
                <span>Fluency: <strong className="text-white">{lastVoiceMetrics.fluency_score}%</strong></span>
                <span>Communication Score: <strong className="text-emerald-400">{lastVoiceMetrics.communication_score}/100</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Voice Recorder & Live Speech-to-Text Controls */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={toggleRecording}
                className={`relative flex h-16 w-16 items-center justify-center rounded-2xl font-bold transition-all shadow-xl ${
                  isRecording
                    ? 'bg-rose-600 text-white shadow-rose-600/40 animate-pulse scale-105 ring-4 ring-rose-500/30'
                    : 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-500 hover:scale-105'
                }`}
              >
                {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
              </button>

              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  {isRecording ? (
                    <>
                      <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping"></span>
                      Listening & Recording...
                    </>
                  ) : (
                    'Click Mic to Record Answer'
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {isRecording
                    ? `Recording Time: ${recordingTime}s | Volume Meter: ${audioVolume}%`
                    : 'Click green microphone button, speak your answer into your mic, or type below.'}
                </p>
              </div>
            </div>

            {/* Live Audio Visualizer Bar */}
            <div className="flex items-center space-x-4 border-l border-slate-800 pl-6 text-xs">
              {isRecording && (
                <div className="flex items-baseline gap-1 h-6">
                  <div className="w-1 bg-emerald-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, audioVolume * 0.24)}px` }}></div>
                  <div className="w-1 bg-emerald-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, audioVolume * 0.4)}px` }}></div>
                  <div className="w-1 bg-emerald-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, audioVolume * 0.3)}px` }}></div>
                  <div className="w-1 bg-emerald-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, audioVolume * 0.15)}px` }}></div>
                </div>
              )}
              <div className="text-center">
                <span className="block text-slate-400">Words</span>
                <strong className="text-base text-white">{words}</strong>
              </div>
              <div className="text-center">
                <span className="block text-slate-400">Est. WPM</span>
                <strong className="text-base text-emerald-400">{liveWpm}</strong>
              </div>
            </div>
          </div>

          {/* Live Transcript Display Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Speech-to-Text Transcript</span>
              {transcribingAudio && (
                <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium animate-pulse">
                  <Wand2 size={13} /> Processing Audio Transcript...
                </span>
              )}
            </label>
            <textarea
              rows={5}
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              placeholder="Click the green microphone button and speak... Your spoken answer will appear here automatically."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
            ></textarea>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setTranscribedText('')}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RefreshCw size={13} />
                <span>Clear Text</span>
              </button>

              {audioChunksRef.current.length > 0 && (
                <button
                  type="button"
                  onClick={handleManualTranscribe}
                  className="flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Wand2 size={13} />
                  <span>Transcribe Recorded Mic Audio</span>
                </button>
              )}
            </div>

            <Button
              onClick={handleSubmitAnswer}
              loading={submitting || transcribingAudio}
              disabled={!transcribedText.trim() && !isRecording && audioChunksRef.current.length === 0}
              className="w-auto px-8 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2"
            >
              <Send size={16} /> Submit Voice Answer
            </Button>
          </div>
        </div>
      </main>

      {/* Floating AI Proctoring Webcam Feed */}
      <WebcamMonitor sessionId={sessionId} />
    </div>
  );
};

export default VoiceInterviewRoom;
