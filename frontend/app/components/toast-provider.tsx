import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  error: (message: string) => void;
  info: (message: string) => void;
  success: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function removeToast(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function addToast(type: ToastType, message: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, type }]);
  }

  const value = useMemo<ToastContextValue>(
    () => ({
      error: (message) => addToast("error", message),
      info: (message) => addToast("info", message),
      success: (message) => addToast("success", message),
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-atomic="true" aria-live="polite" className="toast-viewport">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ onClose, toast }: { onClose: () => void; toast: Toast }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timeoutId);
  }, [onClose]);

  return (
    <article className={`toast toast-${toast.type}`}>
      <p>{toast.message}</p>
      <button aria-label="Cerrar aviso" className="toast-close" onClick={onClose} type="button">
        ×
      </button>
    </article>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
