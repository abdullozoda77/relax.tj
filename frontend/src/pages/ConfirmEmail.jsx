import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { Field } from "../components/AuthModal.jsx";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { t } from "../i18n.js";

// Opened from the link in the confirmation email: /confirm-email?uid=...&token=...
// Confirms the email and logs the user in; if the link is bad, a new letter can be requested.
export default function ConfirmEmail() {
  const [params] = useSearchParams();
  const { loginWithTokens } = useAuth();
  const toast = useToast();
  const [state, setState] = useState({ status: "checking" }); // checking | done | error
  const [email, setEmail] = useState("");
  const started = useRef(false);
  const uid = params.get("uid");
  const token = params.get("token");

  useEffect(() => {
    if (started.current) return; // React may run effects twice in development; confirm once.
    started.current = true;
    if (!uid || !token) return setState({ status: "error", message: t("Ссылка неполная. Запросите письмо ещё раз.") });
    api("/auth/confirm-email/", { method: "POST", body: { uid, token } })
      .then((data) => loginWithTokens(data.tokens))
      .then((user) => setState({ status: "done", username: user.username }))
      .catch((err) => setState({ status: "error", message: err.message }));
  }, [uid, token, loginWithTokens]);

  async function resend(e) {
    e.preventDefault();
    try {
      await api("/auth/resend-confirmation/", { method: "POST", body: { email } });
      toast(t("Если этот email ждёт подтверждения, мы отправили ссылку ещё раз."));
    } catch (err) {
      toast(err.message, "error");
    }
  }

  const icon = { checking: "hourglass_top", done: "verified", error: "link_off" }[state.status];
  return (
    <div className="max-w-md mx-auto px-6 py-24">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-8">
        <Icon name={icon} className={`text-[40px] ${state.status === "error" ? "text-amber-400" : "text-emerald-400"}`} />
        {state.status === "checking" && <h1 className="text-headline-md font-headline-md text-white mt-3">{t("Проверяем ссылку...")}</h1>}
        {state.status === "done" && (
          <>
            <h1 className="text-headline-md font-headline-md text-white mt-3 mb-1">{t("Email подтверждён")}</h1>
            <p className="text-body-md text-slate-400 mb-6">{t("Добро пожаловать, {0}! Регистрация завершена.", state.username)}</p>
            <Link className="block text-center w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-label-md font-label-md" to="/">
              {t("На главную")}
            </Link>
          </>
        )}
        {state.status === "error" && (
          <>
            <h1 className="text-headline-md font-headline-md text-white mt-3 mb-1">{t("Не удалось подтвердить email")}</h1>
            <p className="text-body-md text-slate-400 mb-5">{state.message}</p>
            <form className="space-y-3" onSubmit={resend}>
              <Field autoComplete="email" label="Email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
              <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-label-md font-label-md" type="submit">
                {t("Отправить письмо ещё раз")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
