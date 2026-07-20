import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, AlertTriangle, Eye, ShieldCheck, UserX, Users, Minimize2, ChevronUp, Smartphone } from 'lucide-react';
import API from '../../api/axios';
import axios from 'axios';

const PYTHON_AI_URL = 'http://localhost:8000';

const WebcamMonitor = ({ sessionId, onCheatingIncident }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [minimized, setMinimized] = useState(false);

  // Vision Status States
  const [faceDetected, setFaceDetected] = useState(true);
  const [multiFace, setMultiFace] = useState(false);
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [gazeAway, setGazeAway] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);

  const gazeAwayCountRef = useRef(0);

  // 1. Initialize HTML5 WebRTC Webcam Stream
  useEffect(() => {
    let activeStream = null;

    async function startWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });
        activeStream = stream;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStreamActive(true);
        setCameraError(null);
      } catch (err) {
        console.warn('⚠️ [WebcamMonitor] Camera access error:', err.message);
        setCameraError('Camera access denied or unavailable');
        setStreamActive(false);
      }
    }

    startWebcam();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 2. Keep video element srcObject synced when unminimizing
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [minimized, streamActive]);

  // 3. Tab Switch & Browser Visibility Listener
  useEffect(() => {
    if (!sessionId) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
        logIncident('tab_switch', 'high', 'Candidate switched browser tabs or minimized window.');
      }
    }

    function handleWindowBlur() {
      logIncident('window_blur', 'medium', 'Focus lost from interview window.');
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [sessionId]);

  // 4. Periodic Vision Frame Sampling (Every 1.8 seconds)
  useEffect(() => {
    if (!streamActive || !sessionId) return;

    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState < 2) return;

      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 320, 240);

      const base64Data = canvas.toDataURL('image/jpeg', 0.6);

      try {
        const res = await axios.post(`${PYTHON_AI_URL}/api/vision/analyze`, {
          frame_data: base64Data,
        }, { timeout: 3000 });

        const data = res.data;

        if (data) {
          const isDetected = data.face_detected !== false;
          const isPhone = !!data.phone_detected;
          setFaceDetected(isDetected);
          setMultiFace(!!data.multi_face);
          setPhoneDetected(isPhone);
          setGazeAway(isDetected && !data.multi_face && !isPhone && !!data.gaze_away);

          if (isPhone) {
            logIncident('phone_detected', 'critical', 'Mobile phone detected in camera frame.');
          } else if (!isDetected) {
            gazeAwayCountRef.current = 0;
            logIncident('no_face', 'medium', 'No candidate face detected in camera frame.');
          } else if (data.multi_face) {
            gazeAwayCountRef.current = 0;
            logIncident('multi_face', 'high', 'Multiple faces detected in camera frame.');
          } else if (data.gaze_away) {
            gazeAwayCountRef.current += 1;
            if (gazeAwayCountRef.current >= 2) {
              logIncident('gaze_away', 'low', 'Candidate gaze looking away for extended duration.');
              gazeAwayCountRef.current = 0;
            }
          } else {
            gazeAwayCountRef.current = 0;
          }
        }
      } catch (err) {
        // Silent fallback if python vision service unavailable
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [streamActive, sessionId]);

  // Helper: Log Cheating Incident to Express Backend
  const logIncident = async (eventType, severity, details) => {
    try {
      if (onCheatingIncident) onCheatingIncident({ eventType, severity, details });
      await API.post(`/interviews/${sessionId}/cheating-event`, {
        eventType,
        severity,
        details,
      });
    } catch (err) {
      console.warn('⚠️ Failed to log cheating incident:', err.message);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Always keep video DOM element mounted so WebRTC stream & sampling never break */}
      <div className={minimized ? 'hidden' : 'w-64 rounded-2xl border border-slate-800 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-xl space-y-2 transition-all duration-300'}>
        {/* Header Bar with Minimize Button */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-mono text-[10px]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold uppercase tracking-wider">AI Proctoring</span>
          </div>
          <button
            onClick={() => setMinimized(true)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Minimize to Pill Badge"
          >
            <Minimize2 size={13} />
          </button>
        </div>

        {/* Video Preview Container */}
        <div className="relative overflow-hidden rounded-xl bg-slate-950 aspect-video flex items-center justify-center border border-slate-800/80">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover transform -scale-x-100 ${!streamActive ? 'hidden' : ''}`}
          />

          <canvas ref={canvasRef} className="hidden" />

          {!streamActive && (
            <div className="flex flex-col items-center space-y-1.5 p-3 text-center">
              <CameraOff className="text-slate-600" size={26} />
              <span className="text-[10px] font-semibold text-slate-500">
                {cameraError || 'Camera Initializing...'}
              </span>
            </div>
          )}

          {/* Live Overlay Warning Banners */}
          {streamActive && phoneDetected && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 rounded-lg bg-rose-950/95 border border-rose-500/40 px-2 py-1.5 text-[10px] font-semibold text-rose-200 backdrop-blur-md shadow-lg animate-pulse">
              <Smartphone size={13} className="text-rose-400 shrink-0" />
              <span>⚠️ Mobile Phone Detected!</span>
            </div>
          )}

          {streamActive && !phoneDetected && !faceDetected && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 rounded-lg bg-blue-950/95 border border-blue-500/40 px-2 py-1.5 text-[10px] font-semibold text-blue-200 backdrop-blur-md shadow-lg">
              <UserX size={13} className="text-blue-400 shrink-0" />
              <span>⚠️ No Face Detected in Camera</span>
            </div>
          )}

          {streamActive && faceDetected && multiFace && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 rounded-lg bg-rose-950/95 border border-rose-500/40 px-2 py-1.5 text-[10px] font-semibold text-rose-200 backdrop-blur-md shadow-lg">
              <Users size={13} className="text-rose-400 shrink-0" />
              <span>⚠️ Multiple Faces Detected</span>
            </div>
          )}

          {streamActive && faceDetected && !multiFace && gazeAway && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 rounded-lg bg-amber-950/95 border border-amber-500/40 px-2 py-1.5 text-[10px] font-semibold text-amber-200 backdrop-blur-md shadow-lg">
              <Eye size={13} className="text-amber-400 shrink-0" />
              <span>⚠️ Please Look at Camera</span>
            </div>
          )}
        </div>

        {/* Real-time Status Badges Grid */}
        <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] whitespace-nowrap">
          {/* Face Status */}
          <div
            className={`flex items-center justify-between rounded-lg p-1.5 border overflow-hidden ${
              multiFace
                ? 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                : !faceDetected
                ? 'border-blue-500/40 bg-blue-950/20 text-blue-300'
                : 'border-slate-800 bg-slate-950 text-slate-300'
            }`}
          >
            <span className="flex items-center gap-1 shrink-0">
              {multiFace ? (
                <Users size={11} className="text-rose-400" />
              ) : !faceDetected ? (
                <UserX size={11} className="text-blue-400" />
              ) : (
                <ShieldCheck size={11} className="text-emerald-400" />
              )}
              Face
            </span>
            <span className="font-bold truncate ml-1">
              {multiFace ? 'Multi' : !faceDetected ? 'No Face' : 'Present'}
            </span>
          </div>

          {/* Gaze Direction Status */}
          <div
            className={`flex items-center justify-between rounded-lg p-1.5 border overflow-hidden ${
              gazeAway
                ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                : 'border-slate-800 bg-slate-950 text-slate-300'
            }`}
          >
            <span className="flex items-center gap-1 shrink-0">
              <Eye size={11} className={gazeAway ? 'text-amber-400' : 'text-cyan-400'} />
              Gaze
            </span>
            <span className="font-bold truncate ml-1">{gazeAway ? 'Away' : 'Centered'}</span>
          </div>
        </div>

        {/* Tab Switch Alert Banner */}
        {tabSwitches > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300 font-mono">
            <span className="flex items-center gap-1">
              <AlertTriangle size={12} /> Tab Switches:
            </span>
            <span className="font-bold text-amber-400">{tabSwitches}</span>
          </div>
        )}
      </div>

      {/* Render Minimized Pill Badge with live gaze & tab switch indicators */}
      {minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2.5 rounded-full border border-slate-800 bg-slate-900/95 px-4 py-2 text-xs font-mono shadow-2xl backdrop-blur-xl hover:bg-slate-800 transition-all text-slate-300 border-slate-700/80"
          title="Click to expand video preview"
        >
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">Live</span>
          </span>

          <span className="h-3 w-px bg-slate-800" />

          {/* Collapsed Gaze / Face Status Indicator */}
          {!faceDetected ? (
            <span className="flex items-center gap-1.5 font-semibold text-blue-400">
              <UserX size={13} />
              <span>No Face Detected</span>
            </span>
          ) : multiFace ? (
            <span className="flex items-center gap-1.5 font-semibold text-rose-400">
              <Users size={13} />
              <span>Multi Face</span>
            </span>
          ) : (
            <span className={`flex items-center gap-1.5 font-semibold ${gazeAway ? 'text-amber-400' : 'text-cyan-400'}`}>
              <Eye size={13} />
              <span>{gazeAway ? 'Looking Away' : 'Centered'}</span>
            </span>
          )}

          {tabSwitches > 0 && (
            <>
              <span className="h-3 w-px bg-slate-800" />
              <span className="flex items-center gap-1.5 font-bold text-amber-400">
                <AlertTriangle size={13} />
                <span>{tabSwitches} Tab Switch{tabSwitches > 1 ? 'es' : ''}</span>
              </span>
            </>
          )}

          <ChevronUp size={14} className="text-slate-400 ml-1" />
        </button>
      )}
    </div>
  );
};

export default WebcamMonitor;
