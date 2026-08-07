// Aktives Theme — Proxy auf einen mutablen Holder.
// Komponenten importieren `theme` als T und lesen damit immer
// das aktuelle Theme, ohne dass wir die Variable neu binden müssen.
import { THEMES, getTheme } from "./themes.js";
import { darkenHex, lightenHex } from "../utils/format.js";

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
  // "keyboard" gehört fachlich hierher (fast schwarzer Text auf hellen
  // Tastenflächen), stand aber nie drin — vermutlich, weil sein bg früher ein
  // mittleres Grau war. Ohne den Eintrag nahm die App überall den
  // Dunkel-Zweig: dunkle Overlay-Schleier, colorScheme:"dark" für die
  // Systemfelder, helle Aufsätze auf ohnehin hellen Flächen.
  "keyboard",
]);
export const isLightTheme = (name = _state.current.themeName) =>
  LIGHT_THEMES.has(name);

// ── Abgesetzte Fläche (Budget-Kategorien in den Aufrissen) ───────────────
// Normalfall ist die Kartenfarbe des Themes (surf) — die haben die Themes
// bewusst gewählt. Manche setzen surf aber gleich bg ("Kontrast Hell": beides
// #FFFFFF) oder fast gleich; dort verschwand die Budget-Karte spurlos im
// Hintergrund. Deshalb wird der Helligkeitsabstand gemessen und nur dann
// nachgeholfen, wenn er zu klein ist: helle Themes bekommen eine Spur Dunkel,
// dunkle eine Spur Hell. So hebt sich der Bereich in JEDEM Theme dezent, aber
// erkennbar ab, ohne die Abstimmung der übrigen Themes anzutasten.
const _luma = (c) => {
  const h = String(c||"").replace("#","");
  const f = h.length < 6 ? h.split("").map(x=>x+x).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(f)) return null;
  return (0.299*parseInt(f.slice(0,2),16)
        + 0.587*parseInt(f.slice(2,4),16)
        + 0.114*parseInt(f.slice(4,6),16)) / 255;
};
const MIN_ABSTAND = 0.035;

export function flaecheAbgesetzt() {
  const bg = _state.current.bg, surf = _state.current.surf;
  const lb = _luma(bg), ls = _luma(surf);
  if (lb == null || ls == null || Math.abs(lb - ls) >= MIN_ABSTAND) return surf;
  // darkenHex/lightenHex statt color-mix(): liefert rgb() und funktioniert
  // damit auch auf aelteren iOS-Webviews ohne Wenn und Aber.
  return isLightTheme() ? darkenHex(bg, 0.06) : lightenHex(bg, 0.10);
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
