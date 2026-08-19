import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '') + '/api';
  }
  if (import.meta.env.PROD) {
    return 'https://aquatrack-esq6.onrender.com/api';
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:8080/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Global In-Memory API Cache & In-Flight Request Deduplication
const apiCache = new Map();
const pendingRequests = new Map();

api.interceptors.request.use((config) => {
  const key = `${config.method?.toUpperCase()}:${config.url}:${JSON.stringify(config.params || {})}:${JSON.stringify(config.data || {})}`;

  // Cache lookup for GET requests (15-second cache window for instant snappy navigation)
  if (config.method?.toLowerCase() === 'get' && !config.skipCache) {
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < 15000) {
      config.adapter = () => Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK (Cached)',
        headers: config.headers,
        config
      });
      return config;
    }
  }

  // Deduplicate in-flight requests (Debouncing double clicks / parallel triggers)
  if (pendingRequests.has(key) && config.method?.toLowerCase() !== 'get') {
    const cancelToken = axios.CancelToken.source();
    config.cancelToken = cancelToken.token;
    cancelToken.cancel('Request debounced: Duplicate submit locked.');
  } else if (config.method?.toLowerCase() !== 'get') {
    pendingRequests.set(key, true);
  }

  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((response) => {
  const config = response.config;
  const key = `${config.method?.toUpperCase()}:${config.url}:${JSON.stringify(config.params || {})}:${JSON.stringify(config.data || {})}`;
  
  if (config.method?.toLowerCase() !== 'get') {
    pendingRequests.delete(key);
    // Invalidate GET cache on mutation write
    apiCache.clear();
  } else if (response.status === 200) {
    apiCache.set(key, { data: response.data, timestamp: Date.now() });
  }

  return response;
}, (error) => {
  if (error.config) {
    const config = error.config;
    const key = `${config.method?.toUpperCase()}:${config.url}:${JSON.stringify(config.params || {})}:${JSON.stringify(config.data || {})}`;
    pendingRequests.delete(key);
  }
  return Promise.reject(error);
});

// 🚀 Automatic Background Keep-Alive Ping (every 4.5 minutes to prevent Render spin-down)
if (typeof window !== 'undefined') {
  setInterval(() => {
    api.get('/health', { timeout: 4000, skipCache: true }).catch(() => {});
  }, 4.5 * 60 * 1000);
}

export default api;
