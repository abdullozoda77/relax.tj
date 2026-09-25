// Material Symbols icon: <Icon name="star" filled className="text-amber-400" />
export default function Icon({ name, filled = false, className = "", size }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}`, ...(size ? { fontSize: size } : {}) }}
    >
      {name}
    </span>
  );
}
