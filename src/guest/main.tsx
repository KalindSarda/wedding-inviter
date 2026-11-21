import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import "@fontsource/noto-sans-gujarati/gujarati-400.css";
import "@fontsource/noto-sans-gujarati/gujarati-700.css";
import "./styles.css";
import eventsConfig from "../../config/events.json";
import { t, type Lang, type MessageKey } from "../../i18n";
import { codeFromPath, loadGuest, postRsvp, type LoadResult } from "./api";
import { usePrefersReducedMotion, useLang } from "./hooks";
import { getMockGuest } from "./mockGuest";
import { Intro } from "./Intro";
import { Countdown, Events, Faq, Footer, Hero, Rsvp, Story } from "./Sections";
import type { GuestView, WeddingEvent } from "./types";

const allEvents = (eventsConfig as WeddingEvent[]).slice().sort((a, b) => a.order - b.order);

function LangToggle({ lang, onToggle }: { lang: Lang; onToggle: () => void }) {
  return (
    <button
      type="button"
      class="lang-toggle"
      lang={lang === "en" ? "gu" : "en"}
      aria-label={t(lang, "lang.toggleLabel")}
      onClick={onToggle}
    >
      {t(lang, "lang.toggle")}
    </button>
  );
}

function InvitationPage({ guest, scope, code }: { guest: GuestView; scope: string; code: string | null }) {
  const [lang, setLang] = useLang(guest.defaultLang, scope);
  const reduced = usePrefersReducedMotion();
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  // Only the events this guest is invited to (the API already filters; this keeps config order).
  const invited = allEvents.filter((e) => guest.events.includes(e.slug));
  const target = allEvents[0]?.startsAt ?? new Date().toISOString();

  useEffect(() => {
    document.body.classList.toggle("is-locked", !introDone);
    if (introDone) document.getElementById("main-heading")?.focus({ preventScroll: true });
  }, [introDone]);

  return (
    <>
      <LangToggle lang={lang} onToggle={() => setLang(lang === "en" ? "gu" : "en")} />

      {!introDone && <Intro lang={lang} guestName={guest.name} reducedMotion={reduced} onDone={finishIntro} />}

      <main class={introDone ? "page is-ready" : "page"} aria-hidden={!introDone}>
        <Hero lang={lang} name={guest.name} reducedMotion={reduced} />
        <Story lang={lang} />
        <Countdown lang={lang} target={target} />
        <Events lang={lang} events={invited} />
        <Rsvp
          lang={lang}
          initial={guest.rsvpStatus}
          // No code means the dev-only mock preview: accept locally without calling the API.
          submit={(s) => (code ? postRsvp(code, s) : Promise.resolve(true))}
        />
        <Faq lang={lang} />
        <Footer lang={lang} />
      </main>
      {/* Hook for a future, off-by-default music toggle (not rendered; no audio shipped). */}
    </>
  );
}

/** Neutral page for unknown/malformed codes, and for network errors. Never reveals why a code failed. */
function StatusPage({ kind, onRetry }: { kind: "loading" | "not_found" | "error"; onRetry: () => void }) {
  // No guest, so no default language: follow the browser's language, else English.
  const browserDefault: Lang = navigator.language?.toLowerCase().startsWith("gu") ? "gu" : "en";
  const [lang, setLang] = useLang(browserDefault, "status");
  const keys: Record<typeof kind, [MessageKey, MessageKey | null]> = {
    loading: ["loading", null],
    not_found: ["notfound.title", "notfound.body"],
    error: ["error.title", "error.body"],
  };
  const [title, body] = keys[kind];
  return (
    <>
      <LangToggle lang={lang} onToggle={() => setLang(lang === "en" ? "gu" : "en")} />
      <main class="status" aria-live="polite" aria-busy={kind === "loading"}>
        <h1>{t(lang, title)}</h1>
        {body && <p class="lead">{t(lang, body)}</p>}
        {kind === "error" && (
          <button type="button" class="btn btn--primary" onClick={onRetry}>
            {t(lang, "error.retry")}
          </button>
        )}
      </main>
    </>
  );
}

function Root() {
  const code = useMemo(() => codeFromPath(location.pathname), []);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    // Dev-only preview of dummy guests: `?mock=gu|xss` on the Vite dev server. Stripped from production builds.
    if (import.meta.env.DEV && new URLSearchParams(location.search).has("mock")) {
      setResult({ kind: "ok", guest: getMockGuest() });
      return;
    }
    if (!code) {
      setResult({ kind: "not_found" });
      return;
    }
    let cancelled = false;
    setResult(null);
    loadGuest(code).then((r) => !cancelled && setResult(r));
    return () => {
      cancelled = true;
    };
  }, [code, attempt]);

  if (!result) return <StatusPage kind="loading" onRetry={() => {}} />;
  if (result.kind === "not_found") return <StatusPage kind="not_found" onRetry={() => {}} />;
  if (result.kind === "error") return <StatusPage kind="error" onRetry={() => setAttempt((n) => n + 1)} />;
  // The remembered language is scoped to this invitation link (code), so links never affect each other.
  return <InvitationPage guest={result.guest} scope={code ?? "mock"} code={code} />;
}

render(<Root />, document.getElementById("app")!);
