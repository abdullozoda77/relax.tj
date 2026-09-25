import Icon from "./Icon.jsx";

export default function UserMenu() {
  return (
    <button
      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-1.5 rounded-full text-label-md font-label-md transition-all shadow-md shadow-emerald-950"
      type="button"
    >
      <Icon name="person" className="text-[18px]" /> Войти
    </button>
  );
}
