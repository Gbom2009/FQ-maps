import nl from "./nl.json";
import en from "./en.json";
import { useApp } from "../store/app";

export type Lang = "nl" | "en";
export type Key = keyof typeof nl;

const dict: Record<Lang, Record<Key, string>> = { nl, en };

export function translate(lang: Lang, key: Key): string {
  return dict[lang][key] ?? dict.nl[key] ?? key;
}

export function useT() {
  const lang = useApp((s) => s.lang);
  return (key: Key) => translate(lang, key);
}
