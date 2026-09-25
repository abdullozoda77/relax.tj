import { Link } from "react-router-dom";

export function LogoMark({ small = false }) {
  return (
    <span
      className={`${small ? "h-7 w-7 rounded" : "h-9 w-9 rounded-lg"} bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center`}
    >
      <svg className={small ? "w-5 h-5" : "w-6 h-6"} viewBox="0 0 24 24" fill="none">
        <path d="M2 19 9 7l4 6 3-4 6 10H2Z" fill="#10b981" />
        <path d="M9 7l2.2 3.6L9.5 12 8 10.5 6.6 11.4 9 7Z" fill="#f8fafc" />
        <circle cx="18" cy="5" r="2" fill="#f59e0b" />
      </svg>
    </span>
  );
}

export default function Logo() {
  return (
    <Link className="flex items-center gap-3" to="/">
      <LogoMark />
      <span className="text-headline-sm font-headline-sm text-white tracking-tight flex items-center gap-1.5">
        Relax.tj <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      </span>
    </Link>
  );
}
