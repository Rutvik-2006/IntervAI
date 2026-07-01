import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ShieldAlert, Loader2, ArrowLeft, Mail } from 'lucide-react';
import API from '../../api/axios';
import Button from '../../components/common/Button';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('idle'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(null);
  const [resendError, setResendError] = useState(null);
  
  const verificationStarted = useRef(false);

  useEffect(() => {
    const performVerification = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing. Please check your link.');
        setLoading(false);
        return;
      }

      if (verificationStarted.current) return;
      verificationStarted.current = true;

      try {
        setLoading(true);
        setStatus('loading');
        // Call the backend API directly via Axios
        const response = await API.get(`/auth/verify-email?token=${token}`);
        if (response.data && response.data.status === 'success') {
          setStatus('success');
          setMessage(response.data.message || 'Email verified successfully! You can now log in.');
        } else {
          setStatus('error');
          setMessage('Failed to verify email. Please try again.');
        }
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Verification token is invalid or has expired.';
        setStatus('error');
        setMessage(errMsg);
      } finally {
        setLoading(false);
      }
    };

    performVerification();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail) {
      setResendError('Email is required.');
      return;
    }
    setResendLoading(true);
    setResendError(null);
    setResendSuccess(null);
    try {
      const response = await API.post('/auth/resend-verification', { email: resendEmail });
      if (response.data && response.data.status === 'success') {
        setResendSuccess(response.data.message || 'Verification email resent successfully.');
      }
    } catch (err) {
      setResendError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Ambient background glow */}
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
          
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            Email Verification
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Confirming your registration with AI InterviewOS
          </p>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-8 backdrop-blur-xl shadow-2xl">
          {loading && (
            <div className="flex flex-col items-center justify-center py-6 text-slate-300">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
              <p className="text-sm font-medium">Verifying your email token...</p>
            </div>
          )}

          {!loading && status === 'success' && (
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckCircle size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">Verification Successful!</h3>
                <p className="text-sm text-slate-400">{message}</p>
              </div>
              <Link to="/login" className="block">
                <Button className="w-full">Sign In</Button>
              </Link>
            </div>
          )}

          {!loading && status === 'error' && (
            <div className="space-y-6">
              <div className="flex items-start space-x-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-500">
                <ShieldAlert className="mt-0.5 shrink-0" size={18} />
                <div className="text-sm font-medium">
                  <p className="font-bold">Verification Failed</p>
                  <p className="mt-1 text-xs opacity-90">{message}</p>
                </div>
              </div>

              <div className="border-t border-slate-900 pt-6">
                <h4 className="text-sm font-semibold text-white mb-2">Need a new link?</h4>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Enter your email address below, and we'll send you a new verification link.
                </p>
                
                {resendSuccess && (
                  <p className="mb-4 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-2.5">
                    {resendSuccess}
                  </p>
                )}

                {resendError && (
                  <p className="mb-4 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded p-2.5">
                    {resendError}
                  </p>
                )}

                <form onSubmit={handleResend} className="space-y-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="block w-full rounded-lg border border-slate-900 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                  <Button type="submit" loading={resendLoading} className="w-full">
                    Resend Verification Email
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
