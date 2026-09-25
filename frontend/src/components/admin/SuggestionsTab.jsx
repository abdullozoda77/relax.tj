import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { useToast } from "../../context/ToastContext.jsx";
import Icon from "../Icon.jsx";
import { StatusBadge } from "../SuggestModal.jsx";
import { btnDanger, btnPrimary, card, Empty, input, Label } from "./ui.jsx";
import { locale, t } from "../../i18n.js";

const FILTERS = [
  ["pending", t("На проверке")],
  ["approved", t("Одобренные")],
  ["rejected", t("Отклонённые")],
];

function SuggestionCard({ s, regions, categories, onDone }) {
  const toast = useToast();
  const [region, setRegion] = useState(s.region || "");
  const [category, setCategory] = useState(s.category || "");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const regionName = regions.find((r) => r.id === s.region)?.name;
  const categoryName = categories.find((c) => c.id === s.category)?.name;

  async function decide(action) {
    if (action === "reject" && !comment.trim()) return toast(t("Напишите причину отказа"), "error");
    setBusy(true);
    try {
      const body =
        action === "approve"
          ? { region: region || undefined, category: category || null, admin_comment: comment }
          : { admin_comment: comment };
      await api(`/suggestions/${s.id}/${action}/`, { method: "POST", body });
      toast(action === "approve" ? t("«{0}» добавлено на сайт", s.name) : t("Предложение «{0}» отклонено", s.name));
      onDone();
    } catch (err) {
      toast(err.message, "error");
      setBusy(false);
    }
  }

  return (
    <div className={`${card} flex flex-col md:flex-row gap-5`}>
      {s.image ? (
        <a className="shrink-0" href={s.image} rel="noreferrer" target="_blank">
          <img alt="" className="w-full md:w-48 h-36 object-cover rounded-lg" src={s.image} />
        </a>
      ) : (
        <div className="w-full md:w-48 h-36 rounded-lg bg-surface-container-lowest flex items-center justify-center text-outline shrink-0">
          <Icon name="hide_image" className="text-[32px]" />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-title-md text-title-md text-on-surface">{s.name}</h3>
          <StatusBadge status={s.status} />
        </div>
        <p className="text-label-sm font-label-sm text-on-surface-variant">
          {t("от @")}{s.user.username} · {new Date(s.created_at).toLocaleDateString(locale())}
          {regionName && ` · ${regionName}`}
          {categoryName && ` · ${categoryName}`}
        </p>
        {s.address && <p className="text-body-sm text-on-surface-variant">📍 {s.address}</p>}
        {s.description && <p className="text-body-sm text-on-surface whitespace-pre-line">{s.description}</p>}
        {s.admin_comment && <p className="text-body-sm text-secondary">{t("Комментарий:")} {s.admin_comment}</p>}

        {s.status === "pending" && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <Label text={t("РЕГИОН")}>
              <select className={input} onChange={(e) => setRegion(e.target.value)} value={region}>
                <option value="">{t("— выберите —")}</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Label>
            <Label text={t("КАТЕГОРИЯ")}>
              <select className={input} onChange={(e) => setCategory(e.target.value)} value={category}>
                <option value="">{t("— без категории —")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Label>
            <Label text={t("КОММЕНТАРИЙ (для отказа — обязательно)")}>
              <input className={input} onChange={(e) => setComment(e.target.value)} value={comment} />
            </Label>
            <div className="sm:col-span-3 flex gap-2">
              <button className={btnPrimary} disabled={busy || !region} onClick={() => decide("approve")} type="button">
                <Icon name="check" className="text-[18px]" /> {t("Одобрить и создать место")}
              </button>
              <button className={btnDanger} disabled={busy} onClick={() => decide("reject")} type="button">
                <Icon name="close" className="text-[18px]" /> {t("Отклонить")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuggestionsTab() {
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState(null);
  const [regions, setRegions] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api("/regions/?page_size=100").then((d) => setRegions(d.results)).catch(() => {});
    api("/categories/?page_size=100").then((d) => setCategories(d.results)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setItems(null);
    api(`/suggestions/?status=${status}&page_size=50`)
      .then((d) => setItems(d.results))
      .catch(() => setItems([]));
  }, [status]);

  useEffect(load, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            className={`px-4 py-1.5 rounded-full text-label-md font-label-md border ${
              status === value ? "bg-primary/15 text-primary border-primary/40" : "text-on-surface-variant border-outline-variant hover:text-on-surface"
            }`}
            onClick={() => setStatus(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {items === null && <div className="h-40 rounded-xl bg-surface-container animate-pulse" />}
      {items?.length === 0 && <Empty>{t("Здесь пока пусто.")}</Empty>}
      {items?.map((s) => (
        <SuggestionCard key={s.id} categories={categories} onDone={load} regions={regions} s={s} />
      ))}
    </div>
  );
}
