// The site's loading indicator: a thin faded ring with a short arc running around it.
export default function Spinner({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" className={`${className} spinner shrink-0 text-primary`} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
      <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
