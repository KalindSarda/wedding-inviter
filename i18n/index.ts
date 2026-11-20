import en from "./en.json";
import gu from "./gu.json";

export type Lang = "en" | "gu";
export type MessageKey = keyof typeof en;

const dictionaries: Record<Lang, Record<string, string>> = { en, gu };

/** Look up a UI string; falls back to English, then to the key itself. */
export function t(lang: Lang, key: MessageKey): string {
  return dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
}

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "gu";
}
