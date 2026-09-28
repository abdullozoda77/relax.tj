import { Link } from "react-router-dom";

// The round Rohat badge (the full logo with the side landscapes is /brand/logo.webp).
export function LogoMark({ className = "h-10 w-10" }) {
  return <img alt="" className={`${className} shrink-0 rounded-full drop-shadow-md`} height="128" src="/brand/badge.webp" width="128" />;
}

export default function Logo() {
  return (
    <Link className="flex items-center gap-3" to="/">
      <LogoMark />
      <span className="text-headline-sm font-headline-sm text-white tracking-tight flex items-center gap-1.5">
        Rohat <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      </span>
    </Link>
  );
}
