import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isAppReady: false, // Helps prevent a screen flash while we check for the cookie on initial load

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

  setAppReady: (status) => set({ isAppReady: status })
}));