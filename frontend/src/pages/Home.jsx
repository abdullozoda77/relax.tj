import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import CategoriesSection from "../components/home/CategoriesSection.jsx";
import Hero from "../components/home/Hero.jsx";
import InfoSection from "../components/home/InfoSection.jsx";
import ListsSection from "../components/home/ListsSection.jsx";
import MapSection from "../components/home/MapSection.jsx";
import PlacesSection from "../components/home/PlacesSection.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useUi } from "../context/UiContext.jsx";

const EMPTY_FILTERS = { region: "", category: "", best_season: "", ordering: "-created_at", is_free: false };
const DUSHANBE = { lat: 38.5598, lng: 68.787 };
const NEARBY_RADIUS_KM = 100;

export default function Home() {
  const toast = useToast();
  const { requireLogin, openSuggest } = useUi();
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, search });
  const [nearby, setNearby] = useState(null);
  const [regions, setRegions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});

  // The search text lives in the URL (?search=...), so the header and footer links can change it.
  useEffect(() => {
    setFilters((prev) => (prev.search === search ? prev : { ...prev, search }));
    if (search) setNearby(null);
  }, [search]);

  useEffect(() => {
    api("/regions/?page_size=100").then((d) => setRegions(d.results)).catch(() => {});
    api("/categories/?page_size=100").then((d) => setCategories(d.results)).catch(() => {});
    const count = (path) => api(`${path}?page_size=1`).then((d) => d.count).catch(() => "—");
    Promise.all([count("/places/"), count("/regions/"), count("/activities/")]).then(([places, regionsCount, activities]) =>
      setStats({ places, regions: regionsCount, activities })
    );
  }, []);

  // Any filter change leaves the "nearby" mode.
  function changeFilters(update) {
    setNearby(null);
    setFilters(update);
  }

  function resetFilters() {
    setNearby(null);
    setFilters({ ...EMPTY_FILTERS, search: "" });
    if (search) setParams({}, { replace: true });
  }

  function selectCategory(id) {
    changeFilters((prev) => ({ ...prev, category: id }));
    document.getElementById("places")?.scrollIntoView();
  }

  async function showNearby({ lat, lng }, fallback) {
    const title = `Места рядом ${fallback ? "с Душанбе" : "с вами"} (до ${NEARBY_RADIUS_KM} км)`;
    setNearby({ title, places: null });
    document.getElementById("places")?.scrollIntoView();
    try {
      const data = await api(`/places/nearby/?lat=${lat}&lng=${lng}&radius=${NEARBY_RADIUS_KM}&page_size=12`);
      setNearby({ title, places: data.results });
    } catch (err) {
      toast(err.message, "error");
      setNearby(null);
    }
  }

  function findNearby() {
    const useDushanbe = () => {
      toast("Не удалось определить местоположение — показываем места рядом с Душанбе", "error");
      showNearby(DUSHANBE, true);
    };
    if (!navigator.geolocation) return useDushanbe();
    navigator.geolocation.getCurrentPosition(
      (pos) => showNearby({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }, false),
      useDushanbe,
      { timeout: 8000 }
    );
  }

  async function copyList(list) {
    if (!requireLogin("Войдите, чтобы копировать маршруты")) return;
    try {
      const copy = await api(`/travel-lists/${list.id}/copy/`, { method: "POST" });
      toast(`Маршрут «${copy.title}» добавлен в ваши списки`);
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <>
      <Hero onNearby={findNearby} stats={stats} />
      <PlacesSection
        categories={categories}
        filters={filters}
        nearby={nearby}
        onReset={resetFilters}
        regions={regions}
        setFilters={changeFilters}
      />
      <MapSection />
      <CategoriesSection categories={categories} onSelect={selectCategory} />
      <InfoSection onSuggest={() => openSuggest()} />
      <ListsSection onCopy={copyList} />
    </>
  );
}
