import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import Icon from "../Icon.jsx";
import Stars from "../Stars.jsx";

const MAX_PHOTOS = 5;

function ReviewForm({ placeId, onSaved }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  // Previews for the chosen photos; object URLs are freed when the list changes.
  const [previews, setPreviews] = useState([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function pickFiles(e) {
    const chosen = [...files, ...e.target.files].slice(0, MAX_PHOTOS);
    if (files.length + e.target.files.length > MAX_PHOTOS) toast(`Можно прикрепить не больше ${MAX_PHOTOS} фото`, "error");
    setFiles(chosen);
    e.target.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (!rating) return toast("Поставьте оценку от 1 до 5 звёзд", "error");
    setBusy(true);
    const body = new FormData();
    body.append("place", placeId);
    body.append("rating", rating);
    body.append("comment", comment.trim());
    files.forEach((f) => body.append("uploaded_images", f));
    try {
      await api("/reviews/", { method: "POST", body });
      toast("Спасибо за отзыв!");
      onSaved();
    } catch (err) {
      toast(err.message, "error");
      setBusy(false);
    }
  }

  return (
    <form className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3" onSubmit={submit}>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} type="button">
            <Icon filled={n <= (hover || rating)} name="star" className={n <= (hover || rating) ? "text-amber-400" : "text-slate-600"} size={28} />
          </button>
        ))}
        <span className="text-body-sm text-slate-400 ml-2">Ваша оценка</span>
      </div>
      <textarea
        className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-body-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
        onChange={(e) => setComment(e.target.value)}
        placeholder="Расскажите, как вам это место"
        rows={3}
        value={comment}
      />
      <div className="flex flex-wrap items-center gap-2">
        {previews.map((url, i) => (
          <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700">
            <img alt="" className="w-full h-full object-cover" src={url} />
            <button
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-slate-950/80 text-slate-200 flex items-center justify-center"
              onClick={() => setFiles(files.filter((_, j) => j !== i))}
              title="Убрать фото"
              type="button"
            >
              <Icon name="close" className="text-[14px]" />
            </button>
          </div>
        ))}
        {files.length < MAX_PHOTOS && (
          <label className="w-16 h-16 rounded-lg border border-dashed border-slate-600 hover:border-emerald-400 text-slate-400 hover:text-emerald-300 flex flex-col items-center justify-center cursor-pointer text-[10px] gap-0.5">
            <Icon name="add_a_photo" className="text-[20px]" />
            Фото
            <input accept=".jpg,.jpeg,.png,.webp" className="hidden" multiple onChange={pickFiles} type="file" />
          </label>
        )}
        <span className="text-label-sm font-label-sm text-slate-500">до {MAX_PHOTOS} фото, jpg/png/webp до 5 МБ</span>
      </div>
      <button
        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-5 py-2 rounded-lg text-label-md font-label-md disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        Отправить отзыв
      </button>
    </form>
  );
}

// Reviews of one place. onSummary gets the new average and count after changes.
export default function Reviews({ placeId, onSummary }) {
  const { user } = useAuth();
  const { openAuth } = useUi();
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api(`/places/${placeId}/reviews/?page_size=20`)
      .then((result) => {
        setData(result);
        onSummary?.(result.rating_summary);
      })
      .catch((err) => toast(err.message, "error"));
  }, [placeId, onSummary, toast]);

  useEffect(load, [load]);

  async function remove(id) {
    if (!confirm("Удалить ваш отзыв?")) return;
    try {
      await api(`/reviews/${id}/`, { method: "DELETE" });
      toast("Отзыв удалён");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (!data) return <p className="text-slate-400">Загрузка отзывов...</p>;

  const summary = data.rating_summary;
  const myReview = user && data.results.find((r) => r.author.id === user.id);
  // JS orders number-like keys ascending, so sort to show 5 stars first.
  const bars = Object.entries(summary.stars).sort((a, b) => b[0] - a[0]);

  return (
    <div>
      <h3 className="text-headline-sm font-headline-sm text-white mb-6">Отзывы</h3>
      <div className="grid md:grid-cols-[180px_1fr] gap-6 mb-6">
        <div className="space-y-1.5">
          {bars.map(([star, count]) => (
            <div key={star} className="flex items-center gap-2 text-body-sm text-slate-400">
              <span className="w-3">{star}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${summary.total ? (count * 100) / summary.total : 0}%` }} />
              </div>
              <span className="w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
        <div>
          {!user ? (
            <div className="h-full flex flex-col items-start justify-center gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-5">
              <p className="text-body-sm text-slate-300">Были здесь? Войдите, чтобы оставить отзыв.</p>
              <button
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-label-md font-label-md"
                onClick={() => openAuth("login")}
                type="button"
              >
                Войти
              </button>
            </div>
          ) : (
            !myReview && <ReviewForm onSaved={load} placeId={placeId} />
          )}
        </div>
      </div>
      <div className="space-y-3">
        {data.results.length === 0 && <p className="text-body-sm text-slate-400">Пока нет отзывов. Будьте первым!</p>}
        {data.results.map((r) => (
          <div key={r.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold uppercase">
                  {r.author.username[0]}
                </span>
                <div>
                  <p className="text-body-sm text-white font-semibold">{r.author.username}</p>
                  <p className="text-label-sm font-label-sm text-slate-500">{new Date(r.created_at).toLocaleDateString("ru-RU")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Stars rating={r.rating} size={14} />
                {myReview?.id === r.id && (
                  <button className="text-slate-500 hover:text-rose-400" onClick={() => remove(r.id)} title="Удалить отзыв" type="button">
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                )}
              </div>
            </div>
            {r.comment && <p className="text-body-sm text-slate-300 leading-relaxed">{r.comment}</p>}
            {r.images?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {r.images.map((img) => (
                  <a key={img.id} href={img.image} rel="noreferrer" target="_blank">
                    <img alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-800 hover:opacity-80 transition-opacity" src={img.image} />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
