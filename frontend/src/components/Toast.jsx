"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

const ToastContext = createContext(null);

const STYLES = {
  success: { Icon: CheckCircle2, bar: "#16A34A" },
  error: { Icon: XCircle, bar: "#DC2626" },
  warning: { Icon: AlertTriangle, bar: "#D97706" },
  info: { Icon: Info, bar: "#2563EB" },
};

export function useToast() {
  const ctx = useContext(ToastContext);
  // Safe no-op fallback so components never crash if rendered outside provider.
  if (!ctx) {
    const noop = () => {};
    return { show: noop, success: noop, error: noop, warning: noop, info: noop, dismiss: noop };
  }
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, type = "info", duration = 4500) => {
    if (!message) return;
    const id = ++idRef.current;
    setToasts((list) => [...list, { id, message: String(message), type }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const api = {
    show,
    dismiss,
    success: (m, d) => show(m, "success", d),
    error: (m, d) => show(m, "error", d),
    warning: (m, d) => show(m, "warning", d),
    info: (m, d) => show(m, "info", d),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-[360px] pointer-events-none">
        {toasts.map((t) => {
          const { Icon, bar } = STYLES[t.type] || STYLES.info;
          return (
            <div
              key={t.id}
              role="alert"
              className="pointer-events-auto flex items-start gap-3 bg-white rounded-xl shadow-[0_10px_30px_rgba(15,23,42,0.15)] border border-slate-100 pr-3 py-3 pl-4 animate-toastIn"
              style={{ borderLeft: `4px solid ${bar}` }}
            >
              <Icon size={20} style={{ color: bar }} className="shrink-0 mt-0.5" />
              <p className="flex-1 text-slate-800 text-[13px] font-body font-bold m-0 leading-snug break-words">
                {t.message}
              </p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="bg-transparent border-none cursor-pointer text-slate-400 p-0 mt-0.5 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
