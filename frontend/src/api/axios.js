import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // Crucial for sending/receiving cookies securely
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to handle silent token refreshing on 401 errors
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    // Check if error is 401 (Unauthorized) and we haven't already retried this request
    const url = originalRequest.url || '';
    const isAuthRequest = url && (
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password') ||
      url.includes('/auth/verify-email') ||
      url.includes('/auth/resend-verification')
    );

    if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        // Attempt to call the token refresh endpoint
        const response = await axios.post(
          `${API.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (response.status === 200) {
          // If refresh was successful, retry original request
          return API(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed/expired -> trigger a redirect or force logout
        console.error('Session expired, logging out...', refreshError);
        
        // Trigger a custom event that AuthContext can listen to for logging out
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
