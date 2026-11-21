import { useState } from "preact/hooks";
import { t, tf, type Lang, type MessageKey } from "../../i18n";
import { useNow, useParallax, useReveal } from "./hooks";
import type { RsvpStatus, WeddingEvent } from "./types";

export function Hero({ lang, name, reducedMotion }: { lang: Lang; name: string; reducedMotion: boolean }) {
  const bg = useParallax<HTMLElement>(!reducedMotion);
  return (
    <header class="hero" ref={bg}>
      <div class="hero__inner">
        <p class="eyebrow">{t(lang, "poster.kicker")}</p>
        {/* name is rendered as a text node: Preact escapes it */}
        <h1 id="main-heading" tabIndex={-1}>
          {tf(lang, "greeting.title", { name })}
        </h1>
        <p class="lead">{t(lang, "greeting.sub")}</p>
        <a class="scroll-hint" href="#story">
          {t(lang, "greeting.scroll")} <span aria-hidden="true">↓</span>
        </a>
      </div>
    </header>
  );
}

export function Story({ lang }: { lang: Lang }) {
  const r = useReveal<HTMLElement>();
  return (
    <section id="story" ref={r.ref} class={`section ${r.className}`}>
      <h2>{t(lang, "story.heading")}</h2>
      <p>{t(lang, "story.p1")}</p>
      <p>{t(lang, "story.p2")}</p>
      <p>{t(lang, "story.p3")}</p>
    </section>
  );
}

export function Countdown({ lang, target }: { lang: Lang; target: string }) {
  const r = useReveal<HTMLElement>();
  const now = useNow();
  const diff = Math.max(0, new Date(target).getTime() - now);
  const parts: [number, MessageKey][] = [
    [Math.floor(diff / 86_400_000), "countdown.days"],
    [Math.floor(diff / 3_600_000) % 24, "countdown.hours"],
    [Math.floor(diff / 60_000) % 60, "countdown.minutes"],
    [Math.floor(diff / 1000) % 60, "countdown.seconds"],
  ];
  return (
    <section ref={r.ref} class={`section section--tint ${r.className}`} aria-labelledby="countdown-h">
      <h2 id="countdown-h">{t(lang, "countdown.heading")}</h2>
      {diff === 0 ? (
        <p class="lead">{t(lang, "countdown.done")}</p>
      ) : (
        // Not announced every second to screen readers; the visible text is still readable.
        <ul class="countdown" aria-live="off">
          {parts.map(([n, label]) => (
            <li key={label}>
              <span class="countdown__n">{String(n).padStart(2, "0")}</span>
              <span class="countdown__l">{t(lang, label)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatWhen(iso: string, lang: Lang): string {
  const locale = lang === "gu" ? "gu-IN" : "en-IN";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function Events({ lang, events }: { lang: Lang; events: WeddingEvent[] }) {
  const r = useReveal<HTMLElement>();
  return (
    <section ref={r.ref} class={`section ${r.className}`} aria-labelledby="events-h">
      <h2 id="events-h">{t(lang, "events.heading")}</h2>
      {events.length === 0 && <p>{t(lang, "events.none")}</p>}
      <div class="cards">
        {events.map((ev) => (
          <article class="card" key={ev.slug}>
            <h3>{ev.name[lang]}</h3>
            <dl>
              <dt>{t(lang, "events.when")}</dt>
              <dd>
                <time dateTime={ev.startsAt}>{formatWhen(ev.startsAt, lang)}</time>
              </dd>
              <dt>{t(lang, "events.where")}</dt>
              <dd>
                {ev.venue[lang]}
                {ev.mapUrl && /^https:\/\//.test(ev.mapUrl) && (
                  <>
                    {" "}
                    <a href={ev.mapUrl} target="_blank" rel="noopener noreferrer">
                      {t(lang, "events.map")}
                    </a>
                  </>
                )}
              </dd>
              <dt>{t(lang, "events.dress")}</dt>
              <dd>{ev.dressCode[lang]}</dd>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Saves via `submit` (POST /api/guest/:code/rsvp). The shown answer only changes once the server confirms it. */
export function Rsvp({
  lang,
  initial,
  submit,
}: {
  lang: Lang;
  initial: RsvpStatus | null;
  submit: (s: RsvpStatus) => Promise<boolean>;
}) {
  const r = useReveal<HTMLElement>();
  const [status, setStatus] = useState<RsvpStatus | null>(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const showButtons = status === null || editing;

  const choose = async (s: RsvpStatus) => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const ok = await submit(s);
    setBusy(false);
    if (ok) {
      setStatus(s);
      setEditing(false);
    } else {
      setFailed(true);
    }
  };

  return (
    <section ref={r.ref} class={`section section--tint ${r.className}`} aria-labelledby="rsvp-h">
      <h2 id="rsvp-h">{t(lang, "rsvp.heading")}</h2>
      <p class="lead">{t(lang, "rsvp.sub")}</p>

      {showButtons ? (
        <div class="rsvp__buttons">
          <button type="button" class="btn btn--primary btn--big" disabled={busy} onClick={() => choose("yes")}>
            {busy ? t(lang, "rsvp.saving") : t(lang, "rsvp.yes")}
          </button>
          <button type="button" class="btn btn--ghost btn--big" disabled={busy} onClick={() => choose("no")}>
            {t(lang, "rsvp.no")}
          </button>
          {editing && !busy && (
            <button type="button" class="btn btn--link rsvp__cancel" onClick={() => { setEditing(false); setFailed(false); }}>
              {t(lang, "rsvp.cancel")}
            </button>
          )}
        </div>
      ) : (
        <div class="rsvp__done" role="status" aria-live="polite">
          <p class="rsvp__msg">{status === "yes" ? t(lang, "rsvp.yesDone") : t(lang, "rsvp.noDone")}</p>
          <p class="rsvp__current">
            {tf(lang, "rsvp.current", {
              answer: status === "yes" ? t(lang, "rsvp.answerYes") : t(lang, "rsvp.answerNo"),
            })}
          </p>
          <button type="button" class="btn btn--link" onClick={() => setEditing(true)}>
            {t(lang, "rsvp.change")}
          </button>
        </div>
      )}

      {failed && (
        <p class="rsvp__error" role="alert">
          {t(lang, "rsvp.error")}
        </p>
      )}
    </section>
  );
}

const FAQ: [MessageKey, MessageKey][] = [
  ["faq.q1", "faq.a1"],
  ["faq.q2", "faq.a2"],
  ["faq.q3", "faq.a3"],
  ["faq.q4", "faq.a4"],
  ["faq.q5", "faq.a5"],
  ["faq.q6", "faq.a6"],
  ["faq.q7", "faq.a7"],
];

export function Faq({ lang }: { lang: Lang }) {
  const r = useReveal<HTMLElement>();
  return (
    <section ref={r.ref} class={`section ${r.className}`} aria-labelledby="faq-h">
      <h2 id="faq-h">{t(lang, "faq.heading")}</h2>
      <div class="faq">
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{t(lang, q)}</summary>
            <p>{t(lang, a)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Footer({ lang }: { lang: Lang }) {
  return (
    <footer class="footer">
      <p>{t(lang, "footer.credits")}</p>
    </footer>
  );
}
