import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { lang, t } from "../i18n.js";

// "Continue with Google": Google's own button (Google Identity Services). After the user picks an account,
// Google gives an ID token, and the server checks it and returns our tokens. The client ID comes from the
// server (/auth/google/), so the button is hidden while GOOGLE_CLIENT_ID is not set in .env.
let setup = null;

function loadGoogle() {
  setup ??= Promise.all([
    api("/auth/google/").then((data) => data.client_id),
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    }),
  ]).then(([clientId]) => clientId);
  setup.catch(() => {
    setup = null; // try again the next time the window opens
  });
  return setup;
}

export default function GoogleButton({ onCredential, label = "continue_with" }) {
  const box = useRef(null);
  const handler = useRef(onCredential);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    handler.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let alive = true;
    loadGoogle()
      .then((clientId) => {
        if (!alive || !clientId || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => handler.current(response.credential),
          ux_mode: "popup",
        });
        window.google.accounts.id.renderButton(box.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: label,
          locale: lang === "tg" ? "ru" : lang,
          width: Math.min(box.current.offsetWidth || 320, 400),
        });
        setShown(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [label]);

  return (
    <div className={shown ? "" : "invisible h-0 overflow-hidden"}>
      <div className="flex items-center gap-3 my-5 text-body-sm text-slate-500">
        <span className="h-px flex-1 bg-slate-700/80" />
        {t("или")}
        <span className="h-px flex-1 bg-slate-700/80" />
      </div>
      <div className="flex justify-center min-h-[44px]" ref={box} />
    </div>
  );
}
