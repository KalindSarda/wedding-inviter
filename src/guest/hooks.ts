import { useEffect, useRef, useState } from "preact/hooks";
import { isLang, type Lang } from "../../i18n";

// The remembered language is scoped to one invitation link, so a choice made on one link
// (e.g. a family member's phone, or the admin previewing links) never overrides another link's default.
const LANG_KEY_PREFIX = "wi.lang:";

export function usePrefersReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function readStoredLang(scope: string): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY_PREFIX + scope);
    return isLang(v) ? v : null;
  } catch {
    return null; // storage can be blocked (private mode etc.)
  }
}

/** Opens in the guest's default language; a manual choice (via the toggle) overrides it for this link only. */
export function useLang(defaultLang: Lang, scope: string): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang(scope) ?? defaultLang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY_PREFIX + scope, l);
    } catch {
      /* ignore */
    }
  };
  return [lang, setLang];
}

/** Adds `is-visible` once the element scrolls into view (fade-in). No-op styling for reduced motion lives in CSS. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, className: visible ? "reveal is-visible" : "reveal" };
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Light parallax: writes --parallax (px) on the element as the page scrolls. Disabled when reduced. */
export function useParallax<T extends HTMLElement>(enabled: boolean, factor = 0.25) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      el.style.setProperty("--parallax", `${Math.round(window.scrollY * factor)}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled, factor]);
  return ref;
}
