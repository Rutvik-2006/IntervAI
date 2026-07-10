import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import Login from '../features/auth/Login';
import Register from '../features/auth/Register';
import ForgotPassword from '../features/auth/ForgotPassword';
import ResetPassword from '../features/auth/ResetPassword';
import VerifyEmail from '../features/auth/VerifyEmail';
import { useAuth } from '../context/AuthContext';
import ResumeUpload from '../features/dashboard/ResumeUpload';
import RecentSessionsList from '../features/dashboard/RecentSessionsList';
import Button from '../components/common/Button';
import StartInterviewModal from '../features/interview/StartInterviewModal';
import TextInterviewRoom from '../features/interview/TextInterviewRoom';
import VoiceInterviewRoom from '../features/interview/VoiceInterviewRoom';
import InterviewReportView from '../features/interview/InterviewReportView';
import API from '../api/axios';

// Router component that dispatches to Text or Voice room based on session mode or query param
const InterviewRoomDispatcher = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const [sessionMode, setSessionMode] = useState(searchParams.get('mode') || null);
  const [loading, setLoading] = useState(!searchParams.get('mode'));

  useEffect(() => {
    if (!sessionMode) {
      API.get(`/interviews/${sessionId}/current-question`)
        .then((res) => {
          if (res.data?.data?.session?.mode) {
            setSessionMode(res.data.data.session.mode);
          } else {
            setSessionMode('text');
          }
        })
        .catch(() => setSessionMode('text'))
        .finally(() => setLoading(false));
    }
  }, [sessionId, sessionMode]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading interview environment...
      </div>
    );
  }

  if (sessionMode === 'voice') {
    return <VoiceInterviewRoom />;
  }

  return <TextInterviewRoom />;
};

// Candidate Dashboard with Resume Upload & ATS Analysis
const Dashboard = () => {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  const [startError, setStartError] = useState(null);

  const handleStartInterview = async (config) => {
    try {
      setStarting(true);
      setStartError(null);
      const response = await API.post('/interviews/start', config);
      if (response.data && response.data.data?.session) {
        const session = response.data.data.session;
        setIsModalOpen(false);
        if (session.mode === 'voice') {
          navigate(`/interview/${session._id}?mode=voice`);
        } else {
          navigate(`/interview/${session._id}`);
        }
      }
    } catch (err) {
      console.error('Failed to start interview session:', err);
      setStartError(err.response?.data?.message || 'Failed to start interview session. Please ensure your backend is running.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold tracking-wider text-indigo-400">AI InterviewOS</h1>
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="!py-2 !px-4 text-xs flex items-center gap-1.5"
            >
              Start AI Mock Interview
            </Button>
            <span className="text-sm font-medium text-slate-400 hidden md:inline">
              Signed in as: <strong className="text-slate-200">{user?.email}</strong>
            </span>
            <Button onClick={logout} variant="secondary" className="!py-2 !px-4">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-6 space-y-6">
        <ResumeUpload />
        <RecentSessionsList />
      </main>

      <StartInterviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStart={handleStartInterview}
        loading={starting}
        error={startError}
      />
    </div>
  );
};

const Unauthorized = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 text-center px-4">
    <h1 className="text-4xl font-extrabold text-rose-500 mb-2">403 Unauthorized</h1>
    <p className="text-slate-400 text-sm mb-6">You do not have access permissions for this portal.</p>
    <Link to="/dashboard">
      <Button variant="secondary" className="w-auto px-6">Return to Dashboard</Button>
    </Link>
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* Publicly Accessible Auth Routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>

      {/* Private Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/interview/:sessionId" element={<InterviewRoomDispatcher />} />
        <Route path="/interview/:sessionId/report" element={<InterviewReportView />} />
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
