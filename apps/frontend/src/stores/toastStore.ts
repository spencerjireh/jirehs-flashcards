import { create } from 'zustand';
import type { Toast } from '../components/Notifications/Toast';

let toastId = 0;

const AUTO_DISMISS_MS = 3500;
const REMOVAL_SAFETY_MS = 1000;

interface ToastState {
  toasts: Toast[];
  autoDismissMs: number;
  show: (message: string, type?: Toast['type']) => string;
  dismiss: (id: string) => void;
  remove: (id: string) => void;
}

// Track timers outside the store to avoid serialization issues
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const safetyTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  autoDismissMs: AUTO_DISMISS_MS,

  show: (message, type = 'info') => {
    const id = String(++toastId);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));

    const timer = setTimeout(() => {
      timers.delete(id);
      get().dismiss(id);
    }, AUTO_DISMISS_MS);
    timers.set(id, timer);

    return id;
  },

  dismiss: (id) => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, dismissing: true } : t)),
    }));
    const safety = setTimeout(() => {
      safetyTimers.delete(id);
      get().remove(id);
    }, REMOVAL_SAFETY_MS);
    safetyTimers.set(id, safety);
  },

  remove: (id) => {
    const safety = safetyTimers.get(id);
    if (safety) {
      clearTimeout(safety);
      safetyTimers.delete(id);
    }
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
