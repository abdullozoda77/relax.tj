import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import Icon from "../Icon.jsx";
import Stars from "../Stars.jsx";
import { Empty, input } from "./ui.jsx";
import { locale, t } from "../../i18n.js";

export default function ReviewsTab() {
  const toast = useToast();
  const { openPlace } = useUi();
  const [reviews, setReviews] = useState(null);
  const [rating, setRating] = useState("");

  const load = useCallback(() => {
    const q = new URLSearchParams({ page_size: 100, ordering: "-created_at" });
    if (rating) q.set("rating", rating);
    api(`/reviews/?${q}`)
      .then((d) => setReviews(d.results))
      .catch(() => setReviews([]));
  }, [rating]);

  useEffect(load, [load]);

  async function remove(r) {
    if (!confirm(t("Удалить отзыв @{0} о «{1}»?", r.author.username, r.place_name))) return;
    try {
      await api(`/reviews/${r.id}/`, { method: "DELETE" });
      toast(t("Отзыв удалён"));
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <select className={`${input} sm:max-w-xs`} onChange={(e) => setRating(e.target.value)} value={rating}>
        <option value="">{t("Все оценки")}</option>
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {"★".repeat(n)} ({n})
          </option>
        ))}
      </select>
      {reviews === null && <div className="h-64 rounded-xl bg-surface-container animate-pulse" />}
      {reviews?.length === 0 && <Empty>{t("Отзывов нет.")}</Empty>}
      {reviews?.map((r) => (
        <div key={r.id} className="bg-surface-container rounded-xl p-4 flex gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <button className="font-title-md text-title-md text-on-surface hover:text-primary" onClick={() => openPlace(r.place)} type="button">
                {r.place_name}
              </button>
              <Stars rating={r.rating} size={14} />
            </div>
            <p className="text-label-sm font-label-sm text-on-surface-variant mb-2">
              @{r.author.username} · {new Date(r.created_at).toLocaleString(locale())}
            </p>
            {r.comment && <p className="text-body-sm text-on-surface">{r.comment}</p>}
            {r.images?.length > 0 && (
              <div className="flex gap-2 mt-2">
                {r.images.map((img) => (
                  <a key={img.id} href={img.image} rel="noreferrer" target="_blank">
                    <img alt="" className="w-14 h-14 rounded object-cover" src={img.image} />
                  </a>
                ))}
              </div>
            )}
          </div>
          <button className="self-start p-2 text-on-surface-variant hover:text-rose-400" onClick={() => remove(r)} title={t("Удалить отзыв")} type="button">
            <Icon name="delete" className="text-[20px]" />
          </button>
        </div>
      ))}
    </div>
  );
}
