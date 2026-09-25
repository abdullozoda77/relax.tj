import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(() => {});

// const toast = useToast(); toast("Сохранено"); toast("Ошибка", "error");
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null);
  const timer = useRef();

  const toast = useCallback((text, type = "ok") => {
    setMessage({ text, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {message && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl border shadow-2xl text-body-sm max-w-[90vw] ${
            message.type === "error"
              ? "bg-red-950/95 border-red-800 text-red-200"
              : "bg-slate-900/95 border-emerald-500/40 text-emerald-200"
          }`}
        >
          {message.text}
        </div>
      )}
    </ToastContext.Provider>
  );
}
