import axios from 'axios';
import { useSocketStore } from '../store/socketStore';

// 1. Create the base Axios instance
const apiClient = axios.create({
  baseURL: '/api/v1', // We will set up a proxy in Vite later so this points to your backend
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

// 3. Request Interceptor: Attach the token to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
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

// 4. Response Interceptor: The "Tripwire" for 401 Errors
apiClient.interceptors.response.use(
  (response) => response, // If the request succeeds, just return it
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is a 401, and ensure we haven't already retried this exact request
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Prevent infinite loops: Don't intercept if the refresh route or login route itself failed
      if (originalRequest.url.includes('/auth/refresh-token') || originalRequest.url.includes('/auth/login')) {
        return Promise.reject(error);
      }

      // If a refresh is already happening, queue this request up and wait
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest); // Retry with the new token
          })
          .catch((err) => Promise.reject(err));
      }

      // Start the refresh process
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Ask the backend for a new token (Axios automatically sends the cookie)
        const { data } = await axios.post('/api/v1/auth/refresh-token', {}, { 
          baseURL: '/api/v1',
          withCredentials: true 
        });
        
        setAccessToken(data.accessToken);
        
        // Let the queued requests know we have a new token
        processQueue(null, data.accessToken);
        
        // Retry the original request that triggered this whole process
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        // If the refresh fails (cookie expired, revoked, or stolen), clear everything
        processQueue(refreshError, null);
        setAccessToken(null);
        
        // Force the user back to the login page to re-authenticate
        window.location.href = '/login'; 
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

apiClient.interceptors.request.use((config) => {
  const socket = useSocketStore.getState().socket;
  if (socket && socket.id) {
    config.headers['x-socket-id'] = socket.id;
  }
  return config;
});

export default apiClient;

// Add these to your API service file
export const linkTasks = (sourceId, targetId) => 
  apiClient.post(`/tasks/${sourceId}/links`, { targetId });

export const getTaskLinks = (taskId) => 
  apiClient.get(`/tasks/${taskId}/links`);

export const getTaskLinks = (taskId) => apiClient.get(`/tasks/${taskId}/links`);