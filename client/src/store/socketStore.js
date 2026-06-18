import { create } from 'zustand';
import { io } from 'socket.io-client';

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  
  // Presence State
  activeUsers: [],

  connect: () => {
    if (get().socket) return; // Prevent duplicate connections

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true, // Crucial for passing the HTTP-only auth cookie
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity, // Keep trying if offline
    });

    socket.on('connect', () => set({ isConnected: true }));
    socket.on('disconnect', () => {
      set({ isConnected: false, activeUsers: [] }); // Clear users on disconnect
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, activeUsers: [] });
    }
  },

  // Presence Actions
  setActiveUsers: (users) => set({ activeUsers: users }),
  
  addActiveUser: (user) => set((state) => {
    // Prevent duplicates if the user is already in the list
    if (state.activeUsers.some(u => u.id === user.id)) return state;
    return { activeUsers: [...state.activeUsers, user] };
  }),
  
  removeActiveUser: (userId) => set((state) => ({
    activeUsers: state.activeUsers.filter(u => u.id !== userId)
  })),

  clearActiveUsers: () => set({ activeUsers: [] })
}));