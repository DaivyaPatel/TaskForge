import axios from 'axios';
import { useSocketStore } from '../store/socketStore';
import { useToastStore } from '../store/useToastStore';

// 1. Create the base Axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true, // CRITICAL: This tells Axios to send your HTTP-only refresh cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. In-memory token storage (Safest place to store JWTs on the frontend)
let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// 3. SINGLE Request Interceptor: Attach Token & Socket ID
apiClient.interceptors.request.use(
  (config) => {
    // Attach JWT if we have it
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // Attach Socket ID to prevent the server from echoing events back to the sender
    const socket = useSocketStore.getState().socket;
    if (socket && socket.id) {
      config.headers['x-socket-id'] = socket.id;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Variables to manage the refresh queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 4. Response Interceptor: The Tripwire for 401s & Global Errors
apiClient.interceptors.response.use(
  (response) => response, // If the request succeeds, pass it through
  async (error) => {
    const originalRequest = error.config;

    // --- SCENARIO A: Token Expired (401) ---
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Prevent infinite loops on auth routes
      if (originalRequest.url.includes('/auth/refresh-token') || originalRequest.url.includes('/auth/login')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/v1/auth/refresh-token', {}, { 
          baseURL: import.meta.env.VITE_API_URL || '/api/v1',
          withCredentials: true 
        });
        
        setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        
        // Notify the user before kicking them out
        useToastStore.getState().addToast({ 
          type: 'warning', 
          message: 'Your session expired. Please log in again.' 
        });
        
        window.location.href = '/login'; 
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // --- SCENARIO B: Standard Errors (400, 403, 500, Network Drop) ---
    // We avoid toasting for 401s here because Scenario A is actively trying to fix them
    if (error.response?.status !== 401) {
      const message = error.response?.data?.message || 'An unexpected network error occurred.';
      useToastStore.getState().addToast({ type: 'error', message });
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// --- SPECIFIC API SERVICES ---
export const linkTasks = (sourceId, targetId) => 
  apiClient.post(`/tasks/${sourceId}/links`, { targetId });

export const getTaskLinks = (taskId) => 
  apiClient.get(`/tasks/${taskId}/links`);