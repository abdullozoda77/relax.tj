// Small shared pieces for the admin panel.

export const card = "bg-surface-container rounded-xl p-5 shadow-xl";
export const input =
  "w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-sm text-on-surface placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary";
export const btnPrimary =
  "bg-primary hover:bg-tertiary-container text-on-primary font-semibold text-body-sm px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50";
export const btnSecondary =
  "bg-surface-container-high hover:bg-surface-bright text-on-surface text-body-sm px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50";
export const btnDanger =
  "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-body-sm px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50";

export function Label({ text, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{text}</span>
      {children}
    </label>
  );
}

export function Empty({ children }) {
  return <p className="text-body-md text-on-surface-variant py-10 text-center">{children}</p>;
}
