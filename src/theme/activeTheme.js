// Aktives Theme — Proxy auf einen mutablen Holder.
// Komponenten importieren `theme` als T und lesen damit immer
// das aktuelle Theme, ohne dass wir die Variable neu binden müssen.
import { THEMES, getTheme } from "./themes.js";
import { darkenHex, lightenHex } from "../utils/format.js";

const _state = { current: THEMES.dark };

export function setActiveTheme(name, extra = {}) {
  _state.current = { ...getTheme(name), themeName: name, ...extra };
}

const _luma = (c) => {
  const h = String(c||"").replace("#","");
  const f = h.length < 6 ? h.split("").map(x=>x+x).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(f)) return null;
  return (0.299*parseInt(f.slice(0,2),16)
        + 0.587*parseInt(f.slice(2,4),16)
        + 0.114*parseInt(f.slice(4,6),16)) / 255;
};

// Zentrale Liste der hellen Themes. Vorher lag dieser Vergleich als
// inline-Kette ~50x im Code — teils veraltet (neuere helle Themes fehlten).
const LIGHT_THEMES = new Set([
  "light", "ios", "material", "paper", "dkb",
  "sand", "clean", "brutalist", "swiss", "hellgrau",
  "kontrasthell", "creme", "cleancorporate", "softecotech",
  // Diese drei gehören fachlich längst dazu (dunkler Text auf hellen
  // Flächen), standen aber nie drin — bei "keyboard" vermutlich, weil sein
  // Hintergrund früher ein mittleres Grau war, bei den beiden Kinder-Themes
  // schlicht vergessen. Ohne Eintrag nahm die App dort überall den
  // Dunkel-Zweig: dunkle Overlay-Schleier, colorScheme:"dark" für die
  // Systemfelder, helle Aufsätze auf ohnehin hellen Flächen.
  "keyboard", "abenteuergruen", "zirkustaschenrechner",
]);

// Sicherheitsnetz hinter der Liste: ein Theme mit hellem Hintergrund IST
// hell, auch wenn es oben jemand vergessen hat. Genau das war dreimal
// passiert (siehe die drei Nachträge). Die Liste bleibt trotzdem — sie
// entscheidet die Grenzfälle, in denen ein Theme trotz mittlerer Helligkeit
// bewusst als hell oder dunkel gelten soll. Ergebnis pro Name gemerkt, weil
// isLightTheme in jedem Render dutzendfach aufgerufen wird.
const _hellCache = new Map();
export const isLightTheme = (name = _state.current.themeName) => {
  if (LIGHT_THEMES.has(name)) return true;
  if (_hellCache.has(name)) return _hellCache.get(name);
  const t = name === _state.current.themeName ? _state.current : THEMES[name];
  const l = _luma(t && t.bg);
  const hell = l != null && l >= 0.5;
  _hellCache.set(name, hell);
  return hell;
};

// ── Abgesetzte Fläche (Budget-Kategorien in den Aufrissen) ───────────────
// Normalfall ist die Kartenfarbe des Themes (surf) — die haben die Themes
// bewusst gewählt. Manche setzen surf aber gleich bg ("Kontrast Hell": beides
// #FFFFFF) oder fast gleich; dort verschwand die Budget-Karte spurlos im
// Hintergrund. Deshalb wird der Helligkeitsabstand gemessen und nur dann
// nachgeholfen, wenn er zu klein ist: helle Themes bekommen eine Spur Dunkel,
// dunkle eine Spur Hell. So hebt sich der Bereich in JEDEM Theme dezent, aber
// erkennbar ab, ohne die Abstimmung der übrigen Themes anzutasten.
const MIN_ABSTAND = 0.05;   // ab hier gilt surf als ausreichend abgesetzt
const ZIEL_ABSTAND = 0.07;  // so weit rueckt das Nachhelfen vom Untergrund weg

// `untergrund` ist die Flaeche, auf der die Karte TATSAECHLICH liegt — im
// Prognose-Aufriss das Panel (surf3), in den Buchungen-/VM-Aufrissen der
// Seitenhintergrund (bg). Ein erster Versuch mass immer gegen bg; im
// Prognose-Aufriss ging das an der Sache vorbei und lieferte in "Kinorot"
// eine Karte fast in Panel-Farbe, in "Papier" sogar eine dunklere als noetig
// (Nutzer-Bilder). Seitdem entscheidet der echte Untergrund.
export function flaecheAbgesetzt(untergrund = _state.current.bg) {
  const surf = _state.current.surf;
  const lu = _luma(untergrund), ls = _luma(surf);
  if (lu == null) return surf;
  if (ls != null && Math.abs(lu - ls) >= MIN_ABSTAND) return surf;
  // Der Schritt wird auf ZIEL_ABSTAND gerechnet statt fest vorgegeben: ein
  // fester Faktor faellt je nach Ausgangshelligkeit unterschiedlich stark aus
  // (auf fast Schwarz kaum sichtbar, auf mittlerem Grau zu kraeftig). Aufhellen
  // verschiebt die Luma um (1-luma)*a, Abdunkeln um luma*a — nach a aufgeloest
  // landet jedes Theme auf demselben wahrgenommenen Abstand.
  // darkenHex/lightenHex statt color-mix(): liefert rgb() und funktioniert
  // damit auch auf aelteren iOS-Webviews ohne Wenn und Aber.
  const klemm = (a) => Math.min(0.9, Math.max(0.02, a));
  return isLightTheme()
    ? darkenHex(untergrund,  klemm(ZIEL_ABSTAND / Math.max(0.05, lu)))
    : lightenHex(untergrund, klemm(ZIEL_ABSTAND / Math.max(0.05, 1 - lu)));
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
