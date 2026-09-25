import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import Icon from "../Icon.jsx";
import Stars from "../Stars.jsx";
import { locale, t } from "../../i18n.js";

export default function ReviewsCard({ onChanged }) {
  const toast = useToast();
  const { openPlace } = useUi();
  const [reviews, setReviews] = useState(null);

  const load = () =>
    api("/reviews/my/?page_size=50")
      .then((data) => setReviews(data.results))
      .catch(() => setReviews([]));

  useEffect(() => {
    load();
  }, []);

  async function remove(review) {
    if (!confirm(t("Удалить отзыв о месте «{0}»?", review.place_name))) return;
    try {
      await api(`/reviews/${review.id}/`, { method: "DELETE" });
      toast(t("Отзыв удалён"));
      load();
      onChanged?.();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="bg-surface-container rounded-xl p-6 lg:p-7 shadow-xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="rate_review" className="text-primary text-[24px]" />
          <h3 className="font-title-md text-title-md text-on-surface">{t("Мои отзывы")}</h3>
        </div>
        <span className="font-label-sm text-label-sm text-primary">{reviews ? reviews.length : "…"} {t("ВСЕГО")}</span>
      </div>
      <div className="flex flex-col gap-3">
        {reviews?.length === 0 && <p className="text-body-sm text-on-surface-variant">{t("Вы ещё не писали отзывов.")}</p>}
        {reviews?.map((r) => (
          <div key={r.id} className="bg-surface-container-low hover:bg-surface-container-high transition-colors p-4 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-headline-sm">{r.rating}</div>
              <div className="flex flex-col min-w-0">
                <span className="font-title-md text-title-md text-on-surface leading-none truncate">{r.place_name}</span>
                <span className="mt-1 flex items-center gap-2">
                  <Stars rating={r.rating} size={12} />
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{new Date(r.created_at).toLocaleDateString(locale())}</span>
                </span>
                {r.comment && <span className="text-body-sm text-on-surface-variant truncate mt-1">{r.comment}</span>}
                {r.images?.length > 0 && (
                  <span className="flex gap-1 mt-1.5">
                    {r.images.slice(0, 4).map((img) => (
                      <img key={img.id} alt="" className="w-8 h-8 rounded object-cover" src={img.image} />
                    ))}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0">
              <button className="text-on-surface-variant hover:text-primary transition-colors p-2" onClick={() => openPlace(r.place)} title={t("Открыть место")} type="button">
                <Icon name="visibility" className="text-[20px]" />
              </button>
              <button className="text-on-surface-variant hover:text-rose-400 transition-colors p-2" onClick={() => remove(r)} title={t("Удалить отзыв")} type="button">
                <Icon name="delete" className="text-[20px]" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-surface-container-lowest p-3 rounded-lg flex items-center gap-3">
        <Icon name="tips_and_updates" className="text-primary text-[20px]" />
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t("Ваши отзывы помогают другим путешественникам выбрать место для отдыха.")}</p>
      </div>
    </div>
  );
}
