import { createContext, useCallback, useContext, useState } from "react";
import AuthModal from "../components/AuthModal.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useToast } from "./ToastContext.jsx";

const UiContext = createContext(null);

// Opens the app's modal windows from any component: const { openAuth } = useUi();
export function useUi() {
  return useContext(UiContext);
}

const MODALS = {
  auth: AuthModal,
};

export function UiProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [modal, setModal] = useState(null);

  const closeModal = useCallback(() => setModal(null), []);
  const openAuth = useCallback((tab = "login") => setModal({ type: "auth", props: { tab } }), []);

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

  const ModalComponent = modal && MODALS[modal.type];

  return (
    <UiContext.Provider value={{ openAuth, closeModal, requireLogin }}>
      {children}
      {ModalComponent && <ModalComponent key={JSON.stringify(modal.props)} onClose={closeModal} {...modal.props} />}
    </UiContext.Provider>
  );
}
