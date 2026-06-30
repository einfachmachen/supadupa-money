// Aktives Theme — Proxy auf einen mutablen Holder.
// Komponenten importieren `theme` als T und lesen damit immer
// das aktuelle Theme, ohne dass wir die Variable neu binden müssen.
import { THEMES, getTheme } from "./themes.js";

const _state = { current: THEMES.dark };

export function setActiveTheme(name, extra = {}) {
  _state.current = { ...getTheme(name), themeName: name, ...extra };
}

// Zentrale Liste der hellen Themes. Vorher lag dieser Vergleich als
// inline-Kette ~50x im Code — teils veraltet (neuere helle Themes fehlten).
// Neues helles Theme? NUR hier ergänzen.
const LIGHT_THEMES = new Set([
  "light", "ios", "material", "paper", "dkb",
  "sand", "clean", "brutalist", "swiss", "hellgrau",
  "kontrasthell", "creme", "cleancorporate", "softecotech",
]);
export const isLightTheme = (name = _state.current.themeName) =>
  LIGHT_THEMES.has(name);

// Proxy verhält sich wie das aktuelle Theme-Objekt
export const theme = new Proxy({}, {
  get(_, key) { return _state.current[key]; },
  set(_, key, value) { _state.current[key] = value; return true; },
  ownKeys() { return Reflect.ownKeys(_state.current); },
  getOwnPropertyDescriptor(_, key) {
    return Object.getOwnPropertyDescriptor(_state.current, key);
  },
  has(_, key) { return key in _state.current; },
});
