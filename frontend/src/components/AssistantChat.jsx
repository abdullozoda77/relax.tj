import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import Icon from "./Icon.jsx";
import { t } from "../i18n.js";

const STORAGE_KEY = "assistant-chat";

const SUGGESTIONS = [
  t("Куда поехать летом на 3 дня?"),
  t("Самые красивые озёра"),
  t("Как добраться до Искандеркуля?"),
  t("Как предложить новое место?"),
];

const ERRORS = {
  not_configured: t("AI-помощник пока не подключён."),
  busy: t("Помощник сейчас занят. Попробуйте через минуту."),
  unavailable: t("Помощник сейчас недоступен. Попробуйте позже."),
  too_long: t("Вопрос получился слишком сложным. Попробуйте спросить проще."),
};

// The conversation lives for this browser tab, so it survives moving between pages and reloads.
function loadMessages() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Private mode: the chat is kept only until the page is closed.
  }
}

// **bold** and [name](/places/5). Only links inside the site become links.
function Inline({ text, onNavigate }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i} className="font-semibold text-white">{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      return link[2].startsWith("/") && !link[2].startsWith("//") ? (
        <Link key={i} className="text-emerald-300 underline decoration-emerald-400/40 underline-offset-2 hover:text-emerald-200" onClick={onNavigate} to={link[2]}>
          {link[1]}
        </Link>
      ) : (
        <Fragment key={i}>{link[1]}</Fragment>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// A small part of Markdown, enough for the answers: paragraphs and bulleted or numbered lists.
function Answer({ text, onNavigate }) {
  const blocks = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/^#+\s+/, "").trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const number = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (bullet || number) {
      const type = bullet ? "ul" : "ol";
      if (last?.type === type) last.items.push((bullet || number)[1]);
      else blocks.push({ type, items: [(bullet || number)[1]] });
    } else if (!line.trim()) {
      blocks.push({ type: "gap" });
    } else if (last?.type === "p") {
      last.lines.push(line);
    } else {
      blocks.push({ type: "p", lines: [line] });
    }
  }
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        if (block.type === "p") {
          return (
            <p key={i}>
              {block.lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  <Inline onNavigate={onNavigate} text={line} />
                </Fragment>
              ))}
            </p>
          );
        }
        if (block.type === "ul" || block.type === "ol") {
          const List = block.type;
          return (
            <List key={i} className={`pl-5 space-y-1 ${block.type === "ul" ? "list-disc" : "list-decimal"} marker:text-emerald-400`}>
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline onNavigate={onNavigate} text={item} />
                </li>
              ))}
            </List>
          );
        }
        return null;
      })}
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-2 text-slate-400 text-body-sm">
      <span className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
      {t("Думаю…")}
    </div>
  );
}

// AI assistant: a round button in the corner opens a chat that knows every place, route and page of the site.
export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(true);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => saveMessages(messages), [messages]);

  // Ask once whether the assistant is set up on the server.
  useEffect(() => {
    if (!open) return;
    api("/assistant/")
      .then((data) => setEnabled(data.enabled))
      .catch(() => {});
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, error, open]);

  async function send(history) {
    setSending(true);
    setError("");
    try {
      const data = await api("/assistant/", { method: "POST", body: { messages: history } });
      const reply = data.refused || !data.reply ? t("Не могу ответить на этот вопрос. Спросите что-нибудь другое.") : data.reply;
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(ERRORS[e.data?.code] || (e.status === 429 ? ERRORS.busy : ERRORS.unavailable));
    } finally {
      setSending(false);
    }
  }

  function ask(text) {
    const question = text.trim();
    if (!question || sending) return;
    const history = [...messages, { role: "user", content: question }];
    setMessages(history);
    setInput("");
    send(history);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  }

  // On phones the chat covers the page, so following a link closes it.
  const closeOnPhone = () => window.innerWidth < 640 && setOpen(false);

  return (
    <>
      <button
        aria-label={t("AI-помощник")}
        className={`fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-950/50 flex items-center justify-center transition-all hover:scale-105 ${
          open ? "max-sm:hidden" : ""
        }`}
        onClick={() => setOpen((o) => !o)}
        title={t("AI-помощник")}
        type="button"
      >
        <Icon name={open ? "close" : "auto_awesome"} filled={!open} className="text-[26px]" />
      </button>

      {open && (
        <section
          aria-label={t("AI-помощник")}
          className="fixed z-50 inset-0 sm:inset-auto sm:bottom-24 sm:right-5 sm:w-[400px] sm:h-[min(640px,calc(100vh-11rem))] flex flex-col bg-slate-950/95 backdrop-blur-md sm:border border-slate-700/70 sm:rounded-2xl shadow-2xl overflow-hidden fade-up"
        >
          <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
            <span className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
              <Icon name="auto_awesome" filled className="text-[20px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-body-md font-semibold text-white truncate">{t("AI-помощник Rohat")}</h2>
              <p className="text-label-sm text-slate-400 truncate">{t("Знает все места, маршруты и как работает сайт")}</p>
            </div>
            {messages.length > 0 && (
              <button
                className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
                disabled={sending}
                onClick={() => {
                  setMessages([]);
                  setError("");
                }}
                title={t("Очистить чат")}
                type="button"
              >
                <Icon name="delete_sweep" className="text-[20px]" />
              </button>
            )}
            <button
              className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
              onClick={() => setOpen(false)}
              title={t("Закрыть")}
              type="button"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-body-sm leading-relaxed">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 text-slate-200">
                  {t("Салом! Я AI-помощник Rohat. Спросите меня о местах, маршрутах, поездках по Таджикистану или о том, как пользоваться сайтом.")}
                </div>
                {enabled ? (
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        className="px-3 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 text-label-md transition-colors"
                        onClick={() => ask(s)}
                        type="button"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-amber-300 text-label-md">{ERRORS.not_configured}</p>
                )}
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] bg-emerald-500 text-slate-950 rounded-2xl rounded-br-sm px-4 py-2.5 whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="max-w-[92%] bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 text-slate-200 break-words">
                  <Answer onNavigate={closeOnPhone} text={m.content} />
                </div>
              )
            )}

            {sending && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 w-fit">
                <Thinking />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 text-label-md text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-xl px-3 py-2">
                <Icon name="error" className="text-[18px] shrink-0" />
                <span className="flex-1">{error}</span>
                {messages.at(-1)?.role === "user" && (
                  <button className="font-semibold underline underline-offset-2 hover:text-rose-200" onClick={() => send(messages)} type="button">
                    {t("Повторить")}
                  </button>
                )}
              </div>
            )}
          </div>

          <form
            className="border-t border-slate-800 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                className="flex-1 resize-none max-h-32 min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700/80 text-body-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
                maxLength={2000}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={onKeyDown}
                placeholder={t("Спросите что угодно о Таджикистане или о сайте…")}
                rows={1}
                value={input}
              />
              <button
                aria-label={t("Отправить")}
                className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:hover:bg-emerald-500"
                disabled={!input.trim() || sending}
                title={t("Отправить")}
                type="submit"
              >
                <Icon name="send" filled className="text-[20px]" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-500">{t("Ответы генерирует ИИ и могут содержать ошибки.")}</p>
          </form>
        </section>
      )}
    </>
  );
}
