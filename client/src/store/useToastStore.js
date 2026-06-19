import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
  toasts: [],
  
  addToast: ({ type = 'info', message }) => {
    const id = Date.now(); // Unique ID for each toast
    
    set((state) => {
      // Keep only the newest 3 toasts (so keep the last 2 + the new 1)
      const newToasts = [...state.toasts, { id, type, message }].slice(-3);
      return { toasts: newToasts };
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));