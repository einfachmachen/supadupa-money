// Aktives Theme — Proxy auf einen mutablen Holder.
// Komponenten importieren `theme` als T und lesen damit immer
// das aktuelle Theme, ohne dass wir die Variable neu binden müssen.
import { THEMES, getTheme } from "./themes.js";

const _state = { current: THEMES.dark };

export function setActiveTheme(name, extra = {}) {
  _state.current = { ...getTheme(name), themeName: name, ...extra };
}

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
