import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import "@fontsource/noto-sans-gujarati/gujarati-400.css";
import "@fontsource/noto-sans-gujarati/gujarati-700.css";
import "./styles.css";
import eventsConfig from "../../config/events.json";
import { t } from "../../i18n";
import { usePrefersReducedMotion, useLang } from "./hooks";
import { getMockGuest } from "./mockGuest";
import { Intro } from "./Intro";
import { Countdown, Events, Faq, Footer, Hero, Rsvp, Story } from "./Sections";
import type { WeddingEvent } from "./types";

const allEvents = (eventsConfig as WeddingEvent[]).slice().sort((a, b) => a.order - b.order);

function App() {
  const guest = useMemo(getMockGuest, []);
  // Phase 2: scope = path (the invitation code) + mock variant. Phase 3 will scope by code only.
  const scope = useMemo(
    () => `${location.pathname}|${new URLSearchParams(location.search).get("mock") ?? ""}`,
    [],
  );
  const [lang, setLang] = useLang(guest.defaultLang, scope);
  const reduced = usePrefersReducedMotion();
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  // Only the events this guest is invited to.
  const invited = allEvents.filter((e) => guest.events.includes(e.slug));
  const target = allEvents[0]?.startsAt ?? new Date().toISOString();

  useEffect(() => {
    document.body.classList.toggle("is-locked", !introDone);
    if (introDone) document.getElementById("main-heading")?.focus({ preventScroll: true });
  }, [introDone]);

  return (
    <>
      <button
        type="button"
        class="lang-toggle"
        lang={lang === "en" ? "gu" : "en"}
        aria-label={t(lang, "lang.toggleLabel")}
        onClick={() => setLang(lang === "en" ? "gu" : "en")}
      >
        {t(lang, "lang.toggle")}
      </button>

      {!introDone && <Intro lang={lang} guestName={guest.name} reducedMotion={reduced} onDone={finishIntro} />}

      <main class={introDone ? "page is-ready" : "page"} aria-hidden={!introDone}>
        <Hero lang={lang} name={guest.name} reducedMotion={reduced} />
        <Story lang={lang} />
        <Countdown lang={lang} target={target} />
        <Events lang={lang} events={invited} />
        <Rsvp lang={lang} initial={guest.rsvpStatus} />
        <Faq lang={lang} />
        <Footer lang={lang} />
      </main>
      {/* Hook for a future, off-by-default music toggle (not rendered; no audio shipped). */}
    </>
  );
}

render(<App />, document.getElementById("app")!);
