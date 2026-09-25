import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import AuthModal from "../components/AuthModal.jsx";
import SuggestModal from "../components/SuggestModal.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useToast } from "./ToastContext.jsx";

const UiContext = createContext(null);

// Opens the app's modal windows from any component: const { openPlace } = useUi();
export function useUi() {
  return useContext(UiContext);
}

const MODALS = {
  auth: AuthModal,
  suggest: SuggestModal,
};

export function UiProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  // Favorite changes made on this page: { placeId: true/false }. Cards use them over the value from the API.
  const [favorites, setFavorites] = useState({});
  // Increases after every favorite change, so lists of favorites know to reload.
  const [favoritesVersion, setFavoritesVersion] = useState(0);

  useEffect(() => setFavorites({}), [user?.id]);

  const closeModal = useCallback(() => setModal(null), []);
  const openAuth = useCallback((tab = "login") => setModal({ type: "auth", props: { tab } }), []);
  // Places open as their own page: /places/5
  const openPlace = useCallback((id) => navigate(`/places/${id}`), [navigate]);

  // Returns true if logged in, otherwise shows the login window.
  const requireLogin = useCallback(
    (message = "Войдите, чтобы продолжить") => {
      if (user) return true;
      toast(message, "error");
      openAuth("login");
      return false;
    },
    [user, toast, openAuth]
  );

  const openSuggest = useCallback(
    (name = "") => {
      if (requireLogin("Войдите, чтобы предложить место")) setModal({ type: "suggest", props: { name } });
    },
    [requireLogin]
  );

  const isFavorite = useCallback((place) => favorites[place.id] ?? Boolean(place.is_favorite), [favorites]);

  const toggleFavorite = useCallback(
    async (placeId, current) => {
      if (!requireLogin("Войдите, чтобы добавлять места в избранное")) return;
      try {
        await api(`/places/${placeId}/favorite/`, { method: current ? "DELETE" : "POST" });
      } catch (err) {
        return toast(err.message, "error");
      }
      setFavorites((prev) => ({ ...prev, [placeId]: !current }));
      setFavoritesVersion((v) => v + 1);
      toast(current ? "Удалено из избранного" : "Добавлено в избранное");
    },
    [requireLogin, toast]
  );

  const ModalComponent = modal && MODALS[modal.type];

  return (
    <UiContext.Provider
      value={{ openAuth, openPlace, openSuggest, closeModal, requireLogin, isFavorite, toggleFavorite, favoritesVersion }}
    >
      {children}
      {ModalComponent && <ModalComponent key={JSON.stringify(modal.props)} onClose={closeModal} {...modal.props} />}
    </UiContext.Provider>
  );
}
