import axios from 'axios';
import type { AxiosError } from 'axios';
import type { ApiErrorDetail } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('homesync_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for sanitized and structured error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorDetail>) => {
    // If backend provided a detailed message
    if (error.response?.data?.detail) {
      const errorMsg = error.response.data.detail;
      return Promise.reject(new Error(errorMsg));
    }

    // Status code fallbacks
    if (error.response?.status === 429) {
      return Promise.reject(new Error('Too many requests. Please wait a moment before trying again.'));
    }

    if (error.response?.status === 401) {
      return Promise.reject(new Error('Invalid authentication request. Please check your details.'));
    }

    if (error.response?.status === 403) {
      return Promise.reject(new Error('Account access restricted. Please contact your society administrator.'));
    }

    if (error.response?.status && error.response.status >= 500) {
      return Promise.reject(new Error('Unable to connect to the server. Please try again in a few moments.'));
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
      return Promise.reject(new Error('Network connection failed. Please check your internet connection.'));
    }

    return Promise.reject(new Error(error.message || 'An unexpected error occurred. Please try again.'));
  }
);
