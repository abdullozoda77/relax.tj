import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
import { inputClass } from "./AuthModal.jsx";
import Modal from "./Modal.jsx";

export const SUGGESTION_STATUSES = {
  pending: ["На проверке", "text-amber-300 bg-amber-500/15 border-amber-500/30"],
  approved: ["Одобрено", "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"],
  rejected: ["Отклонено", "text-rose-300 bg-rose-500/15 border-rose-500/30"],
};

export function StatusBadge({ status }) {
  const [text, cls] = SUGGESTION_STATUSES[status] || [status, ""];
  return <span className={`shrink-0 px-2.5 py-0.5 rounded-full border text-label-sm font-label-sm ${cls}`}>{text}</span>;
}

function Label({ text, children }) {
  return (
    <label className="block">
      <span className="block text-label-md font-label-md text-slate-300 mb-1.5">{text}</span>
      {children}
    </label>
  );
}

export default function SuggestModal({ name = "", onClose }) {
  const toast = useToast();
  const [regions, setRegions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/regions/?page_size=100").then((d) => setRegions(d.results)).catch(() => {});
    api("/categories/?page_size=100").then((d) => setCategories(d.results)).catch(() => {});
    api("/suggestions/?page_size=5").then((d) => setMine(d.results)).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    if (!data.get("image")?.size) data.delete("image");
    setBusy(true);
    try {
      await api("/suggestions/", { method: "POST", body: data });
      toast("Спасибо! Ваше предложение отправлено на проверку.");
      onClose();
    } catch (err) {
      toast(err.message, "error");
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-8">
        <h2 className="text-headline-md font-headline-md text-white mb-1">Предложить место</h2>
        <p className="text-body-sm text-slate-400 mb-6">После проверки администратором место появится на сайте.</p>
        <form className="space-y-4" onSubmit={submit}>
          <Label text="Название *">
            <input className={inputClass} defaultValue={name} name="name" required />
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label text="Регион">
              <select className={inputClass} name="region">
                <option value="">—</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Label>
            <Label text="Категория">
              <select className={inputClass} name="category">
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Label>
          </div>
          <Label text="Адрес">
            <input className={inputClass} name="address" placeholder="Район, село или ориентир" />
          </Label>
          <Label text="Описание">
            <textarea className={inputClass} name="description" placeholder="Чем интересно это место?" rows={3} />
          </Label>
          <Label text="Фото (jpg, png, webp, до 5 МБ)">
            <input
              accept=".jpg,.jpeg,.png,.webp"
              className="block w-full text-body-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-800 file:text-emerald-300 hover:file:bg-slate-700"
              name="image"
              type="file"
            />
          </Label>
          <button
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-label-md font-label-md transition-all disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            Отправить
          </button>
        </form>
        {mine.length > 0 && (
          <div className="border-t border-slate-800 mt-8 pt-6">
            <h3 className="text-label-md font-label-md text-emerald-400 uppercase tracking-widest mb-3">Мои предложения</h3>
            <div className="space-y-2">
              {mine.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 text-body-sm">
                  <span className="text-slate-200 truncate" title={s.admin_comment}>
                    {s.name}
                  </span>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
