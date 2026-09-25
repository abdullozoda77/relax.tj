import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { UiProvider } from "./context/UiContext.jsx";
import Home from "./pages/Home.jsx";
import PlaceDetail from "./pages/PlaceDetail.jsx";
import Profile from "./pages/Profile.jsx";

// Scrolls to #places, #lists... after navigation, or to the top when there is no hash.
function ScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const timer = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 50);
    return () => clearTimeout(timer);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <UiProvider>
          <div id="top">
            <ScrollToHash />
            <Header />
            <main className="w-full pt-20 bg-[#0b1117] min-h-screen">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/places/:id" element={<PlaceDetail />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </UiProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
