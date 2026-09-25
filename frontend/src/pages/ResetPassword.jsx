import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { Field } from "../components/AuthModal.jsx";
import Icon from "../components/Icon.jsx";
import { useUi } from "../context/UiContext.jsx";

// Opened from the link in the password reset email: /reset-password?uid=...&token=...
export default function ResetPassword() {
  const [params] = useSearchParams();
  const { openAuth } = useUi();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const uid = params.get("uid");
  const token = params.get("token");

  async function submit(e) {
    e.preventDefault();
    if (password !== password2) return setError("Пароли не совпадают.");
    setBusy(true);
    setError("");
    try {
      await api("/auth/password-reset/confirm/", { method: "POST", body: { uid, token, new_password: password } });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-24">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-8">
        <Icon name={done ? "task_alt" : "lock_reset"} className="text-emerald-400 text-[40px]" />
        <h1 className="text-headline-md font-headline-md text-white mt-3 mb-1">{done ? "Пароль изменён" : "Новый пароль"}</h1>
        {!uid || !token ? (
          <p className="text-body-md text-slate-400">
            Ссылка неполная. Запросите восстановление ещё раз в окне входа.{" "}
            <Link className="text-emerald-400 hover:underline" to="/">
              На главную
            </Link>
          </p>
        ) : done ? (
          <>
            <p className="text-body-md text-slate-400 mb-6">Теперь можно войти с новым паролем.</p>
            <button
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-label-md font-label-md"
              onClick={() => openAuth("login")}
              type="button"
            >
              Войти
            </button>
          </>
        ) : (
          <form className="space-y-4 mt-5" onSubmit={submit}>
            <Field autoComplete="new-password" autoFocus label="Новый пароль" onChange={(e) => setPassword(e.target.value)} required type="password" value={password} />
            <Field autoComplete="new-password" label="Повторите пароль" onChange={(e) => setPassword2(e.target.value)} required type="password" value={password2} />
            {error && <p className="text-body-sm text-red-300 bg-red-950/60 border border-red-900 rounded-lg px-4 py-2.5">{error}</p>}
            <button
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-label-md font-label-md disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy ? "Сохраняем..." : "Сохранить пароль"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
