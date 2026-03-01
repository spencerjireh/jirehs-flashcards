import { useState, useCallback, useRef } from 'react';
import type { Toast } from '../components/Notifications/Toast';

let toastId = 0;

const REMOVAL_SAFETY_MS = 1000;

export function useToast(autoDismissMs = 2500) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const safetyTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    const safety = safetyTimers.current.get(id);
    if (safety) {
      clearTimeout(safety);
      safetyTimers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t))
    );
    // Safety net: remove even if onAnimationEnd never fires
    const safety = setTimeout(() => {
      safetyTimers.current.delete(id);
      remove(id);
    }, REMOVAL_SAFETY_MS);
    safetyTimers.current.set(id, safety);
  }, [remove]);

  const show = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      const id = String(++toastId);
      setToasts((prev) => [...prev, { id, message, type }]);

      const timer = setTimeout(() => {
        timers.current.delete(id);
        dismiss(id);
      }, autoDismissMs);
      timers.current.set(id, timer);

      return id;
    },
    [autoDismissMs, dismiss]
  );

  return { toasts, show, dismiss, remove, autoDismissMs };
}
