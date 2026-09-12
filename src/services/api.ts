import axios from 'axios';

let isRedirecting = false;

const rawBaseUrl = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '') : '';
const apiBaseUrl = rawBaseUrl ? (rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`) : '/api';

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if token in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aagspire_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && !(response.data instanceof Blob) && response.data.data === undefined) {
      // If dashboard or composite data, keep the whole object
      if (response.data.kpis || (response.data.summary && response.data.projectBreakdown)) {
        response.data.data = response.data;
        return response;
      }

      // Find payload key
      const payload =
        response.data.projects ||
        response.data.employees ||
        response.data.clients ||
        response.data.workLogs ||
        response.data.settlements ||
        response.data.receipts ||
        response.data.payments ||
        response.data.attendance ||
        response.data.presets ||
        response.data.project ||
        response.data.employee ||
        response.data.client ||
        response.data.settlement ||
        response.data.receipt ||
        response.data.workLog ||
        response.data.earnings ||
        response.data;
      response.data.data = payload;
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we get an unauthorized error inside the work portal, clear token and redirect once
      if (
        !isRedirecting &&
        (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/employee'))
      ) {
        isRedirecting = true;
        localStorage.removeItem('aagspire_token');
        localStorage.removeItem('aagspire_user');
        window.location.href = '/work/login';
      }
    }
    return Promise.reject(error);
  }
);
