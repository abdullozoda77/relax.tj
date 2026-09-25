import { useEffect } from "react";
import Icon from "./Icon.jsx";

export default function Modal({ onClose, wide = false, children }) {
  // Close on Escape and stop the page behind from scrolling.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`relative w-full ${wide ? "max-w-3xl" : "max-w-lg"} my-8 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl`}>
        <button
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-950/70 hover:bg-slate-800 text-slate-300 flex items-center justify-center"
          onClick={onClose}
          type="button"
        >
          <Icon name="close" className="text-[20px]" />
        </button>
        {children}
      </div>
    </div>
  );
}
