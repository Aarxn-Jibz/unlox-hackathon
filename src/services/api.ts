import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('campus_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Add a response interceptor for global error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Handle unauthorized errors globally
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('campus_token');
      localStorage.removeItem('campus_onboarded');
      localStorage.removeItem('campus_student_info');
      // Redirect to login or trigger an event
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export default api;
