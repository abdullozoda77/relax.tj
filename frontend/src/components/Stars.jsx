import Icon from "./Icon.jsx";

export default function Stars({ rating = 0, size = 16 }) {
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} className="text-amber-400" filled={n <= Math.round(rating)} name="star" size={size} />
      ))}
    </span>
  );
}
