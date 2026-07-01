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
import Button from '../components/common/Button';

// Quick Mock Dashboard to demonstrate state persistence and logout operations
const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
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

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-2xl border border-slate-900 bg-slate-900/30 p-8 backdrop-blur-xl shadow-2xl">
          <h2 className="text-3xl font-extrabold text-white mb-4">Dashboard</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Welcome to the AI Mock Interview Suite! You have successfully signed in using our secure HTTP-only session cookies.
          </p>
          <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4">
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1">
              Authorized Role
            </p>
            <p className="text-sm text-slate-300 font-medium capitalize">{user?.role} Portal</p>
          </div>
        </div>
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
