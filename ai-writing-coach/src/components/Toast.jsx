import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Info } from "lucide-react";
import { cn } from "../lib/cn";

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: (text) => {
        // eslint-disable-next-line no-console
        console.log(`[toast] ${text}`);
      },
    };
  }
  return ctx;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const idRef = useRef(0);
  const timeoutRef = useRef(null);

  const show = useCallback((text, opts = {}) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    const id = ++idRef.current;
    const tone = opts.tone ?? "info";
    const icon = opts.icon ?? null;
    const duration = opts.duration ?? 3000;
    setToast({ id, text, tone, icon });
    timeoutRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, duration);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    []
  );

  // Tone-coloured background + accent. Falls back to the original slate
  // when tone === 'info' so the existing call sites look identical.
  const toneClass = {
    info: "bg-slate-900 text-white border-slate-800",
    brand: "bg-brand-500 text-white border-brand-600 shadow-brand-soft",
    success: "bg-emerald-500 text-white border-emerald-600",
    error: "bg-red-500 text-white border-red-600",
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className={cn(
          "fixed bottom-6 right-6 px-4 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-3 transition-all duration-300 border",
          toneClass[toast?.tone] ?? toneClass.info,
          toast
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2 pointer-events-none"
        )}
        aria-live="polite"
        role="status"
      >
        {toast?.icon ? (
          <span className="flex-shrink-0">{toast.icon}</span>
        ) : (
          <Info className="w-4 h-4 text-brand-400" />
        )}
        <span className="text-xs font-semibold">{toast?.text ?? ""}</span>
      </div>
    </ToastContext.Provider>
  );
}
