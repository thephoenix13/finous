import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useApiData, type Api, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import { buttonClasses } from "../components/ui";
import { reply, topicFor, type AdvisorData, type Reply, type Topic } from "../lib/advisor";
import { askAi } from "../lib/advisorAi";

const loadAdvisorData = async (api: Api, options: RequestOptions): Promise<AdvisorData> => {
  const [cashFlow, accounts] = await Promise.all([api.getCashFlow(options), api.listAccounts(options)]);
  return { cashFlow, accounts };
};

type Message = { id: number; from: "user"; text: string } | ({ id: number; from: "advisor"; via: "ai" | "rules" } & Reply);

const SUGGESTIONS: Topic[] = ["biggest", "prepay", "food", "afford"];

/**
 * Ask a question about the user's own money. The answer comes from the AI advisor (a server function that holds the key);
 * when that cannot answer, a fixed set of rules works it out from the same figures, and the message says which it was.
 * The conversation lives only as long as the screen.
 */
export default function Advisor() {
  const { t, i18n } = useTranslation();
  const result = useApiData(loadAdvisorData);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const fieldId = useId();

  const [pending, setPending] = useState(false);

  const ask = async (question: string, topic: Topic | undefined) => {
    if (result.status !== "ready" || pending) return;
    const data = result.data;
    const lang = i18n.resolvedLanguage === "hi" ? "hi" : "en";
    const history = messages.map((m) => ({ from: m.from, text: m.text }));
    setMessages((prev) => [...prev, { id: prev.length, from: "user", text: question }]);
    setPending(true);
    // The rules know which tool fits a topic, so their link is kept even when the AI wrote the words.
    const rules = reply(topic, data, t, i18n.resolvedLanguage);
    let answer: Message;
    try {
      const ai = await askAi({ question, lang, data, history });
      answer = { id: 0, from: "advisor", via: "ai", text: ai.text, sources: ai.sources, link: rules.link };
    } catch {
      answer = { id: 0, from: "advisor", via: "rules", ...rules };
    }
    setMessages((prev) => [...prev, { ...answer, id: prev.length }]);
    setPending(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const question = text.trim();
    if (!question) return;
    void ask(question, topicFor(question));
    setText("");
  };

  return (
    <div className="flex min-h-full flex-col">
      <section className="px-5 pb-4 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t("advisor.eyebrow")}</p>
        <h1 className="mt-3 font-display text-[28px] leading-[1.15] tracking-tight">{t("advisor.title")}</h1>
        {messages.length === 0 && <p className="mt-4 max-w-[32ch] text-[15px] text-ink-2">{t("advisor.intro")}</p>}
      </section>

      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}

      {result.status === "ready" && messages.length === 0 && (
        <ul className="space-y-2 px-4">
          {SUGGESTIONS.map((topic) => (
            <li key={topic}>
              <button
                type="button"
                onClick={() => void ask(t(`advisor.suggestions.${topic}`), topic)}
                className="flex min-h-[56px] w-full items-center rounded-btn bg-surface px-4 py-3 text-left text-[15px] text-ink shadow-card active:bg-tint"
              >
                {t(`advisor.suggestions.${topic}`)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {messages.length > 0 && (
        <div role="log" aria-label={t("advisor.conversation")} className="flex-1 space-y-4 px-4 pb-4">
          {messages.map((m) =>
            m.from === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-[20px] rounded-br-md bg-brand px-4 py-3 text-[15px] text-on-brand">
                  <span className="sr-only">{t("advisor.you")}: </span>
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={m.id}>
                <div className="max-w-[92%] rounded-[20px] rounded-bl-md bg-surface px-4 py-3 text-[15px] text-ink shadow-card">
                  <p>
                    <span className="sr-only">{t("advisor.advisor")}: </span>
                    {m.text}
                  </p>
                  {m.link && (
                    <Link to={m.link.to} className={buttonClasses("ghost", "sm", false, "mt-3")}>
                      {m.link.label}
                    </Link>
                  )}
                </div>
                {m.sources.length > 0 && <p className="mt-1.5 px-1 text-[12px] text-ink-3">{t("advisor.basedOn", { sources: m.sources.join(" · ") })}</p>}
                {m.via === "rules" && <p className="mt-1 px-1 text-[12px] text-ink-3">{t("advisor.viaRules")}</p>}
              </div>
            ),
          )}
          {pending && (
            <p role="status" className="px-1 text-[13px] text-ink-3">
              {t("advisor.thinking")}
            </p>
          )}
        </div>
      )}

      <div className="sticky bottom-0 mt-auto bg-page px-4 pb-3 pt-2">
        <p className="px-1 pb-2 text-[12px] leading-relaxed text-ink-3">{t("advisor.aiNote")}</p>
        <form onSubmit={submit} className="flex items-center gap-2">
          <label htmlFor={fieldId} className="sr-only">
            {t("advisor.field")}
          </label>
          <input
            id={fieldId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("advisor.placeholder")}
            autoComplete="off"
            className="h-[52px] min-w-0 flex-1 rounded-btn bg-tint px-4 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:bg-surface focus:ring-1 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={result.status !== "ready" || pending}
            className={buttonClasses("primary", "md", false, "shrink-0 disabled:cursor-not-allowed")}
          >
            {t("advisor.send")}
          </button>
        </form>
        <p className="px-1 pt-2 text-[12px] leading-relaxed text-ink-3">{t("advisor.notice")}</p>
      </div>
    </div>
  );
}
