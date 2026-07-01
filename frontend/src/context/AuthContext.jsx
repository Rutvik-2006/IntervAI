import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user session exists in secure cookies on mount
  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await API.get('/auth/me');
      if (response.data && response.data.status === 'success') {
        setUser(response.data.data.user);
      }
    } catch (err) {
      // If unauthorized, user is just not logged in (cookies missing/expired)
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();

    // Listen for global logout events dispatched by Axios interceptors
    const handleGlobalLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth:logout', handleGlobalLogout);
    return () => {
      window.removeEventListener('auth:logout', handleGlobalLogout);
    };
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await API.post('/auth/login', { email, password });
      
      if (response.data && response.data.status === 'success') {
        setUser(response.data.data.user);
        return { success: true };
      }
    } catch (err) {
      console.error('LOGIN ERROR DETECTED:', err);
      console.log('LOGIN ERROR RESPONSE:', err.response);
      const errMsg = err.response?.data?.message || 'Login failed. Please check credentials.';
      setError(errMsg);
      return { success: false, message: errMsg };
    }
  };

  const register = async (email, password, firstName, lastName, role) => {
    try {
      setError(null);
      const response = await API.post('/auth/register', {
        email,
        password,
        firstName,
        lastName,
        role,
      });
      
      if (response.data && response.data.status === 'success') {
        return { success: true, message: response.data.message };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed. Try again.';
      setError(errMsg);
      return { success: false, message: errMsg };
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await API.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err.message);
    } finally {
      setUser(null);
      setError(null);
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      const response = await API.post('/auth/forgot-password', { email });
      if (response.data && response.data.status === 'success') {
        return { success: true, message: response.data.message };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Password reset request failed.';
      setError(errMsg);
      return { success: false, message: errMsg };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      setError(null);
      const response = await API.patch(`/auth/reset-password?token=${token}`, { password });
      if (response.data && response.data.status === 'success') {
        setUser(response.data.data.user);
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Password reset failed.';
      setError(errMsg);
      return { success: false, message: errMsg };
    }
  };

  const resendVerification = async (email) => {
    try {
      setError(null);
      const response = await API.post('/auth/resend-verification', { email });
      if (response.data && response.data.status === 'success') {
        return { success: true, message: response.data.message };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to resend verification email.';
      setError(errMsg);
      return { success: false, message: errMsg };
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    resendVerification,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
