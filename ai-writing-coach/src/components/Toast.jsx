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

  const show = useCallback((text, tone = "info") => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    const id = ++idRef.current;
    setToast({ id, text, tone });
    timeoutRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3000);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className={cn(
          "fixed bottom-6 right-6 px-4 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-3 transition-all duration-300 border",
          "bg-slate-900 text-white border-slate-800",
          toast
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2 pointer-events-none"
        )}
        aria-live="polite"
        role="status"
      >
        <Info className="w-4 h-4 text-brand-400" />
        <span className="text-xs font-semibold">{toast?.text ?? ""}</span>
      </div>
    </ToastContext.Provider>
  );
}
