import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import Login from '../features/auth/Login';
import Register from '../features/auth/Register';
import ForgotPassword from '../features/auth/ForgotPassword';
import ResetPassword from '../features/auth/ResetPassword';
import VerifyEmail from '../features/auth/VerifyEmail';
import { useAuth } from '../context/AuthContext';
import ResumeUpload from '../features/dashboard/ResumeUpload';
import Button from '../components/common/Button';

// Candidate Dashboard with Resume Upload & ATS Analysis
const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold tracking-wider text-indigo-400">AI InterviewOS</h1>
          <div className="flex items-center space-x-6">
            <span className="text-sm font-medium text-slate-400">
              Signed in as: <strong className="text-slate-200">{user?.email}</strong> ({user?.role})
            </span>
            <Button onClick={logout} variant="secondary" className="!py-2 !px-4">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-6">
        <ResumeUpload />
      </main>
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
      {/* Publicly Accessible Auth Routes (Redirects to dashboard if logged in) */}
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
      </Route>

      {/* Role specific routing example */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        {/* Admin panels would go here */}
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Fallback Catch-All Redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
