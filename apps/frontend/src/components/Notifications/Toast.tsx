import { Xmark, CheckCircle, InfoCircle, WarningTriangle } from 'iconoir-react';
import type { AnimationEvent } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  dismissing?: boolean;
}

const ICON_MAP = {
  success: CheckCircle,
  info: InfoCircle,
  warning: WarningTriangle,
} as const;

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  onRemove: (id: string) => void;
  autoDismissMs: number;
}

function ToastItem({ toast, onDismiss, onRemove, autoDismissMs }: ToastItemProps) {
  const Icon = ICON_MAP[toast.type];

  const handleAnimationEnd = (e: AnimationEvent) => {
    if (e.animationName === 'toastSlideOut') {
      onRemove(toast.id);
    }
  };

  return (
    <div
      role="status"
      className={`toast toast-${toast.type}${toast.dismissing ? ' toast-dismissing' : ''}`}
      onClick={() => onDismiss(toast.id)}
      onAnimationEnd={handleAnimationEnd}
    >
      <Icon className="toast-icon" />
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        aria-label="Close"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
      >
        <Xmark />
      </button>
      {!toast.dismissing && (
        <div
          className="toast-progress"
          style={{ animationDuration: `${autoDismissMs}ms` }}
        />
      )}
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  onRemove: (id: string) => void;
  autoDismissMs: number;
}

export function ToastContainer({ toasts, onDismiss, onRemove, autoDismissMs }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onRemove={onRemove}
          autoDismissMs={autoDismissMs}
        />
      ))}
    </div>
  );
}
