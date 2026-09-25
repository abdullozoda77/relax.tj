import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import CategoriesSection from "../components/home/CategoriesSection.jsx";
import Hero from "../components/home/Hero.jsx";
import InfoSection from "../components/home/InfoSection.jsx";
import ListsSection from "../components/home/ListsSection.jsx";
import PlacesSection from "../components/home/PlacesSection.jsx";

const EMPTY_FILTERS = { region: "", category: "", best_season: "", ordering: "-created_at", is_free: false };

export default function Home() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, search });
  const [regions, setRegions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});

  // The search text lives in the URL (?search=...), so the header and footer links can change it.
  useEffect(() => {
    setFilters((prev) => (prev.search === search ? prev : { ...prev, search }));
  }, [search]);

  useEffect(() => {
    api("/regions/?page_size=100").then((d) => setRegions(d.results)).catch(() => {});
    api("/categories/?page_size=100").then((d) => setCategories(d.results)).catch(() => {});
    const count = (path) => api(`${path}?page_size=1`).then((d) => d.count).catch(() => "—");
    Promise.all([count("/places/"), count("/regions/"), count("/activities/")]).then(([places, regionsCount, activities]) =>
      setStats({ places, regions: regionsCount, activities })
    );
  }, []);

  function resetFilters() {
    setFilters({ ...EMPTY_FILTERS, search: "" });
    if (search) setParams({}, { replace: true });
  }

  function selectCategory(id) {
    setFilters((prev) => ({ ...prev, category: id }));
    document.getElementById("places")?.scrollIntoView();
  }

  return (
    <>
      <Hero stats={stats} />
      <PlacesSection
        categories={categories}
        filters={filters}
        onReset={resetFilters}
        regions={regions}
        setFilters={setFilters}
      />
      <CategoriesSection categories={categories} onSelect={selectCategory} />
      <InfoSection />
      <ListsSection />
    </>
  );
}
