import axios from 'axios';

let isRedirecting = false;

const rawBaseUrl = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '') : '';
const apiBaseUrl = rawBaseUrl ? (rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`) : '/api';

// In-Memory API Cache System
interface CacheEntry {
  response: any;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();
const DEFAULT_TTL_MS = 25 * 1000; // 25 seconds default TTL for GET requests
// Notifications are polled every 20s; a shorter TTL keeps each poll fresh while still de-duplicating bursts.
const NOTIFICATIONS_TTL_MS = 5 * 1000;
// Bumped on every invalidation so a GET that started before a mutation can't cache pre-mutation data.
let cacheGeneration = 0;

const ttlFor = (url: string) => (url.startsWith('/notifications') ? NOTIFICATIONS_TTL_MS : DEFAULT_TTL_MS);

/**
 * Manually clear the in-memory API cache.
 * @param urlPrefix Optional URL prefix to invalidate only matching endpoints.
 */
export function clearApiCache(urlPrefix?: string): void {
  cacheGeneration += 1;
  for (const map of [apiCache, inFlightRequests] as Map<string, unknown>[]) {
    if (!urlPrefix) {
      map.clear();
      continue;
    }
    for (const key of map.keys()) {
      if (key.includes(urlPrefix)) {
        map.delete(key);
      }
    }
  }
}

// Get the default Axios network adapter
const defaultAdapter = axios.getAdapter(axios.defaults.adapter);

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
  adapter: async (config: any) => {
    const method = (config.method || 'get').toUpperCase();
    const url = config.url || '';
    const responseType = config.responseType || 'json';

    // Do NOT cache blobs (PDFs, files), non-GET requests, or auth session checks
    const isCacheable =
      method === 'GET' &&
      responseType !== 'blob' &&
      responseType !== 'arraybuffer' &&
      !url.includes('/auth/me') &&
      !url.includes('/auth/login') &&
      !config.headers?.['no-cache'] &&
      !String(config.headers?.['Cache-Control'] || '').includes('no-cache');

    if (isCacheable) {
      const cacheKey = `${config.baseURL || ''}${url}?${JSON.stringify(config.params || {})}`;

      // 1. Check existing fresh cache entry
      const cached = apiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < ttlFor(url)) {
        return {
          ...cached.response,
          data: typeof structuredClone === 'function'
            ? structuredClone(cached.response.data)
            : JSON.parse(JSON.stringify(cached.response.data)),
          config,
        };
      }

      // 2. In-flight request deduplication: if identical GET is already in-progress, reuse the promise
      if (inFlightRequests.has(cacheKey)) {
        const inFlightRes = await inFlightRequests.get(cacheKey)!;
        return {
          ...inFlightRes,
          data: typeof structuredClone === 'function'
            ? structuredClone(inFlightRes.data)
            : JSON.parse(JSON.stringify(inFlightRes.data)),
          config,
        };
      }

      // 3. Perform network request and cache the result
      const generation = cacheGeneration;
      const requestPromise = (async () => {
        const response = await defaultAdapter(config);
        // The cache was invalidated while this request was in flight, so its data may predate the change
        if (generation !== cacheGeneration) return response;
        const now = Date.now();
        for (const [key, entry] of apiCache) {
          if (now - entry.timestamp >= DEFAULT_TTL_MS) apiCache.delete(key);
        }
        apiCache.set(cacheKey, {
          response: {
            ...response,
            data: typeof structuredClone === 'function'
              ? structuredClone(response.data)
              : JSON.parse(JSON.stringify(response.data)),
          },
          timestamp: now,
        });
        return response;
      })();

      inFlightRequests.set(cacheKey, requestPromise);
      try {
        return await requestPromise;
      } finally {
        // Only remove our own entry; an invalidation may have replaced it with a newer request
        if (inFlightRequests.get(cacheKey) === requestPromise) inFlightRequests.delete(cacheKey);
      }
    }

    // For POST, PUT, PATCH, DELETE: execute network call, then automatically invalidate cache
    const response = await defaultAdapter(config);
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // Notification read/clear actions don't affect other data, so keep the rest of the cache warm
      const mutatedUrl = String(config.url || '');
      if (mutatedUrl.startsWith('/notifications')) {
        clearApiCache('/notifications');
      } else if (mutatedUrl.endsWith('/invoice-preview')) {
        // Building an invoice preview doesn't change any business data; keep the cache warm
      } else {
        clearApiCache();
      }
    }
    return response;
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
