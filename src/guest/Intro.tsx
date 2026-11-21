import { useEffect, useRef, useState } from "preact/hooks";
import { t, tf, type Lang } from "../../i18n";

type Stage = "poster" | "envelope" | "opening";

type Props = {
  lang: Lang;
  guestName: string;
  reducedMotion: boolean;
  onDone: () => void;
};

/** Poster title card -> animated envelope -> invitation. Always skippable. */
export function Intro({ lang, guestName, reducedMotion, onDone }: Props) {
  const [stage, setStage] = useState<Stage>("poster");
  const mainBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    mainBtn.current?.focus();
  }, [stage]);

  useEffect(() => {
    if (stage !== "opening") return;
    const id = setTimeout(onDone, reducedMotion ? 150 : 1300);
    return () => clearTimeout(id);
  }, [stage, reducedMotion, onDone]);

  return (
    <div class={`intro intro--${stage}`} role="dialog" aria-modal="true" aria-label={t(lang, "poster.title")}>
      <button type="button" class="intro__skip" onClick={onDone}>
        {t(lang, "intro.skip")}
      </button>

      {stage === "poster" && (
        <div class="poster">
          <p class="poster__kicker">{t(lang, "poster.kicker")}</p>
          <h1 class="poster__title">{t(lang, "poster.title")}</h1>
          <p class="poster__tagline">{t(lang, "poster.tagline")}</p>
          <button ref={mainBtn} type="button" class="btn btn--gold" onClick={() => setStage("envelope")}>
            {t(lang, "poster.cta")}
          </button>
        </div>
      )}

      {(stage === "envelope" || stage === "opening") && (
        <div class="envelope-scene">
          <button
            ref={mainBtn}
            type="button"
            class={`envelope ${stage === "opening" ? "is-open" : ""}`}
            onClick={() => stage === "envelope" && setStage("opening")}
            aria-label={t(lang, "envelope.cta")}
          >
            <span class="envelope__letter">
              <span class="envelope__to">{tf(lang, "envelope.for", { name: guestName })}</span>
            </span>
            <span class="envelope__flap" aria-hidden="true" />
            <span class="envelope__front" aria-hidden="true" />
          </button>
          <p class="envelope__cta">{t(lang, "envelope.cta")}</p>
        </div>
      )}
    </div>
  );
}
