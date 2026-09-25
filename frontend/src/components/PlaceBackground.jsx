import { categoryStyle } from "../utils.js";
import Icon from "./Icon.jsx";

// Photo of the place, or a gradient with the category icon when there is no photo.
export default function PlaceBackground({ place, className = "" }) {
  const base = `absolute inset-0 group-hover:scale-105 transition-transform duration-500 ${className}`;
  if (place.main_image) {
    return <div className={`${base} bg-cover bg-center`} style={{ backgroundImage: `url("${place.main_image}")` }} />;
  }
  const style = categoryStyle(place.category?.name ?? place.category);
  return (
    <div className={`${base} bg-gradient-to-br ${style.gradient}`}>
      <Icon name={style.icon} className="absolute right-6 top-8 text-[150px] leading-none text-white/10" />
    </div>
  );
}
