import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Modal from "./Modal.jsx";

export const inputClass =
  "w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700/80 text-body-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400";

export function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="block text-label-md font-label-md text-slate-300 mb-1.5">{label}</span>
      <input className={inputClass} {...props} />
    </label>
  );
}

export default function AuthModal({ tab: initialTab = "login", onClose }) {
  const { login, register } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState({ username: "", email: "", password: "", password2: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = tab === "login";

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = isLogin ? await login(form.username, form.password) : await register(form);
      toast(isLogin ? `Добро пожаловать, ${user.username}!` : "Аккаунт создан. Добро пожаловать!");
      onClose();
    } catch (err) {
      setError(err.status === 401 ? "Неверное имя пользователя или пароль." : err.message);
      setBusy(false);
    }
  }

  const tabClass = (active) =>
    active ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-white border border-transparent";

  return (
    <Modal onClose={onClose}>
      <div className="p-8">
        <h2 className="text-headline-md font-headline-md text-white mb-1">{isLogin ? "С возвращением!" : "Создать аккаунт"}</h2>
        <p className="text-body-sm text-slate-400 mb-6">
          {isLogin ? "Войдите, чтобы добавлять места в избранное и писать отзывы." : "Регистрация займёт меньше минуты."}
        </p>
        <div className="flex gap-2 mb-6 bg-slate-950 p-1 rounded-xl">
          {[
            ["login", "Вход"],
            ["register", "Регистрация"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`flex-1 py-2 rounded-lg text-label-md font-label-md transition-all ${tabClass(tab === value)}`}
              onClick={() => {
                setTab(value);
                setError("");
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <Field autoComplete="username" autoFocus label="Имя пользователя" name="username" onChange={change} required value={form.username} />
          {!isLogin && <Field autoComplete="email" label="Email" name="email" onChange={change} type="email" value={form.email} />}
          <Field
            autoComplete={isLogin ? "current-password" : "new-password"}
            label="Пароль"
            name="password"
            onChange={change}
            required
            type="password"
            value={form.password}
          />
          {!isLogin && (
            <Field autoComplete="new-password" label="Повторите пароль" name="password2" onChange={change} required type="password" value={form.password2} />
          )}
          {error && <p className="text-body-sm text-red-300 bg-red-950/60 border border-red-900 rounded-lg px-4 py-2.5">{error}</p>}
          <button
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-label-md font-label-md transition-all disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? "Подождите..." : isLogin ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>
      </div>
    </Modal>
  );
}
