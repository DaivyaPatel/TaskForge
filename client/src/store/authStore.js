import { create } from 'zustand';
import apiClient, { setAccessToken } from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isAppReady: false,

  setAuth: (user, token) => set({
    user,
    accessToken: token,
    isAuthenticated: true,
    isAppReady: true
  }),

  clearAuth: () => set({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isAppReady: true
  }),

  setAppReady: (status) => set({ isAppReady: status }),

  login: async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
      isAppReady: true,
    });
    return data;
  },

  register: async ({ email, password, displayName }) => {
    const { data } = await apiClient.post('/auth/register', {
      email,
      password,
      displayName,
    });
    return data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isAppReady: true,
      });
    }
  },
}));