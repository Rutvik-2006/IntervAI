import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ShieldAlert, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const ForgotPassword = () => {
  const { forgotPassword, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    clearError();
  }, []);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError(null);
  };

  const validateForm = () => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email) {
      setEmailError('Email address is required.');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email format.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setSuccessMsg(result.message || 'If an account exists, a reset link was sent.');
    }
  };

  if (successMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
        <div className="w-full max-w-md text-center rounded-2xl border border-slate-900 bg-slate-900/40 p-8 backdrop-blur-xl shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-6">
            <CheckCircle size={36} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Email Sent</h2>
          <p className="text-sm text-slate-400 mb-6">{successMsg}</p>
          <Link to="/login">
            <Button variant="secondary">Back to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center">
          <Link
            to="/login"
            className="self-start flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mt-6">
            <Mail size={24} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Enter your email to receive recovery instructions
          </p>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-8 backdrop-blur-xl shadow-2xl">
          {error && (
            <div className="mb-6 flex items-start space-x-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-500">
              <ShieldAlert className="mt-0.5 shrink-0" size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={handleChange}
              error={emailError}
              icon={Mail}
              required
            />

            <Button type="submit" loading={loading} className="mt-6">
              Send Reset Link
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
