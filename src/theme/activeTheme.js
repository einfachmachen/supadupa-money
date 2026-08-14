// Aktives Theme — Proxy auf einen mutablen Holder.
// Komponenten importieren `theme` als T und lesen damit immer
// das aktuelle Theme, ohne dass wir die Variable neu binden müssen.
import { THEMES, getTheme } from "./themes.js";
import { darkenHex, lightenHex } from "../utils/format.js";

const _state = { current: THEMES.dark };

export function setActiveTheme(name, extra = {}) {
  _state.current = { ...getTheme(name), themeName: name, ...extra };
}

export function setThemePreview(previewTheme) {
  if (!previewTheme) {
    // Restore original theme
    const current = _state.current.themeName || 'dark';
    _state.current = { ...getTheme(current), themeName: current };
  } else {
    // Apply preview changes to current theme
    Object.entries(previewTheme).forEach(([key, value]) => {
      if (value !== undefined) {
        _state.current[key] = value;
      }
    });
  }
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
  // Diese beiden gehören fachlich längst dazu (dunkler Text auf hellen
  // Flächen), standen aber nie drin — schlicht vergessen. Ohne Eintrag nahm
  // die App dort überall den Dunkel-Zweig: dunkle Overlay-Schleier,
  // colorScheme:"dark" für die Systemfelder, helle Aufsätze auf ohnehin
  // hellen Flächen.
  //
  // "keyboard" stand hier ebenfalls, solange es helle Tastenflächen mit
  // schwarzem Text hatte. Seit es die dunklen Keycaps der Vorlage nachbildet
  // (weisse Beschriftung, gelbgrüne Zweitbelegung), ist es ein DUNKLES Theme
  // und gehört nicht mehr in diese Liste.
  "abenteuergruen", "zirkustaschenrechner",
]);

// Sicherheitsnetz hinter der Liste: ein Theme mit hellem Hintergrund IST
// hell, auch wenn es oben jemand vergessen hat. Genau das war dreimal
// passiert (siehe die drei Nachträge). Die Liste bleibt trotzdem — sie
// entscheidet die Grenzfälle, in denen ein Theme trotz mittlerer Helligkeit
// bewusst als hell oder dunkel gelten soll. Ergebnis pro Name gemerkt, weil
// isLightTheme in jedem Render dutzendfach aufgerufen wird.
//
// Über beidem steht das Token `hell` im Theme selbst. Es gibt genau einen
// Fall, den weder Liste noch Helligkeit richtig entscheiden können:
// „Tastenhell" hat eine helle Platte (`bg`), aber DUNKLE Karten. Fast jede
// Abfrage von isLightTheme() betrifft eine Karte, einen Dialog oder ein
// Eingabefeld — die sind dort dunkel. Nur der Hintergrund ist hell, und den
// bedient der Zwei-Textfarben-Mechanismus (§4.7), nicht diese Abfrage.
const _hellCache = new Map();
export const isLightTheme = (name = _state.current.themeName) => {
  const th = name === _state.current.themeName ? _state.current : THEMES[name];
  if (th && typeof th.hell === "boolean") return th.hell;
  if (LIGHT_THEMES.has(name)) return true;
  if (_hellCache.has(name)) return _hellCache.get(name);
  const l = _luma(th && th.bg);
  const hell = l != null && l >= 0.5;
  _hellCache.set(name, hell);
  return hell;
};

// ── Abgesetzte Fläche (Budget-Kategorien in den Aufrissen) ───────────────
// Normalfall ist die Kartenfarbe des Themes (surf) — die haben die Themes
// bewusst gewählt. Manche setzen surf aber gleich bg ("Kontrast Hell": beides
// #FFFFFF) oder fast gleich; dort verschwände die Budget-Karte spurlos im
// Hintergrund. Dann rückt der Helfer selbst vom Untergrund ab: heller bei
// dunklen, dunkler bei hellen Themes.
//
// Gemessen wird der **WCAG-Kontrast**, nicht mehr ein Helligkeitsabstand.
// Vorher stand hier eine schlichte Kanal-Mischung (0,299·R + 0,587·G +
// 0,114·B) — die ist NICHT wahrnehmungsgerecht: derselbe Zahlenabstand wirkt
// auf mittlerem Grau deutlich und auf fast Schwarz kaum. "Kontrast Dunkel"
// (bg #000000) und "Glutorange" (bg #161616) lagen damit rechnerisch beide bei
// 0,130 — sichtbar aber bei 1,30 : 1 gegen 1,52 : 1, und genau das war der
// Unterschied, den man sah (Nutzer-Bild). Der Kontrastwert bildet die
// Gamma-Kurve ab und gilt deshalb über den ganzen Helligkeitsbereich gleich.
//
// ZIEL_KONTRAST ist die EINZIGE Stellschraube für "wie deutlich hebt sich ein
// Budget-Bereich ab" — eine Zeile ändern wirkt auf die ganze App. Der Wert ist
// der von "Glutorange", der so gefiel.
const MIN_KONTRAST  = 1.42;  // ab hier gilt surf als ausreichend abgesetzt
const ZIEL_KONTRAST = 1.52;  // so weit rückt das Nachhelfen vom Untergrund weg

const _rgb = (c) => {
  const h = String(c||"").replace("#","");
  const f = h.length < 6 ? h.split("").map(x=>x+x).join("") : h;
  if (/^[0-9a-fA-F]{6}$/.test(f)) {
    return [parseInt(f.slice(0,2),16), parseInt(f.slice(2,4),16), parseInt(f.slice(4,6),16)];
  }
  const m = String(c||"").match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
};
// Relative Leuchtdichte nach WCAG 2.1 (inkl. Gamma-Rücknahme).
const _lum = (c) => {
  const p = _rgb(c);
  if (!p) return null;
  const k = p.map(v => { const x = v/255; return x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); });
  return 0.2126*k[0] + 0.7152*k[1] + 0.0722*k[2];
};
const _kontrast = (a, b) => {
  const la = _lum(a), lb = _lum(b);
  if (la == null || lb == null) return null;
  return (Math.max(la,lb) + 0.05) / (Math.min(la,lb) + 0.05);
};

// `untergrund` ist die Fläche, auf der die Karte TATSÄCHLICH liegt. Aktuell ist
// das überall `T.bg` (Hero-Bereich und Aufriss-Liste sind beide darauf gemalt) —
// genau deshalb hat dieselbe Budget-Kategorie in Prognose und Aufriss dieselbe
// Farbe. Wer irgendwo eine Zwischenfläche einzieht, muss sie an BEIDEN Orten
// einziehen, sonst laufen die Farben wieder auseinander.
//
// Gefahr-Rot für Löschen und Überschreiben (BestaetigenDialog, ton:"gefahr").
//
// BEWUSST nicht aus dem Theme: `T.neg` trägt im 4-Farben-Schema die AUSGABEN-
// Farbe und ist in den meisten Themes cyan — als Warnsignal liest sich das
// überhaupt nicht (Nutzer-Hinweis). Ein Sicherheitshinweis darf auch nicht
// davon abhängen, welches Theme gerade läuft; genau darin liegt sein Wert.
//
// Der Ton ist so gewählt, dass weißer Text darauf 4,77:1 erreicht.
//
// Auf mittelgrauen Karten (mehrere dunkle Themes haben `surf2` um #3D4349) ist
// es rechnerisch UNMÖGLICH, gleichzeitig 3:1 gegen die Karte und 4,5:1 gegen
// weißen Text zu erreichen: die Karte verlangt eine Luminanz ab 0,265, der
// weiße Text erlaubt höchstens 0,183. Deshalb bekommt der Knopf zusätzlich
// eine hellere Kante — sie trägt die Abgrenzung dort, wo die Füllung sie nicht
// tragen kann (≥ 3,9:1 auf allen dunklen Karten). Auf hellen Karten setzt sich
// die Füllung selbst ab (4,42:1). tests/gefahrFarbe.test.js rechnet beides
// über alle Themes nach.
export const GEFAHR = "#D93025";
export const GEFAHR_KANTE = "#FF7A6B";

// Gefahr-Rot als TEXT/Symbol (Loesch-Knoepfe, Symbolkachel der Rueckfrage).
// Anders als die FLAECHE traegt Text die volle Kontrastschwelle von 4,5:1 —
// deshalb je ein eigener Ton fuer dunkle und fuer helle Karten. Das satte
// GEFAHR erreicht auf dunklen Karten nur 1,9:1, die Kantenfarbe 3,3:1
// (Kontrast-Lauf, tools/kontrast.cjs).
//
// Auf HELLEN Karten stand hier bis zuletzt das satte GEFAHR selbst — das
// reicht aber nur gegen reines Weiss (4,8:1) und faellt schon auf leicht
// getoenten Karten durch: im Theme "Tastenhell" (hellgraue Tasten) sind es
// 3,0:1. Der dunklere Ton traegt auf jeder hellen Flaeche der App (>= 4,7:1)
// und verbessert nebenbei die uebrigen hellen Themes.
const GEFAHR_TEXT_DUNKEL = "#FFB3A8";
const GEFAHR_TEXT_HELL = "#9E1B0E";
export const gefahrText = () => (isLightTheme() ? GEFAHR_TEXT_HELL : GEFAHR_TEXT_DUNKEL);

// ── Blasse Variante eines Akzents ───────────────────────────────────────
// Für "noch nicht erreicht" (Prognose Mitte/Ende) und ruhende Kacheln. An
// vier Stellen stand dafür fest `lightenHex(T.blue, 0.35)` — auf dunklem
// Grund richtig, auf hellem genau falsch herum: dort NIMMT Aufhellen den
// Kontrast weg. Im Theme "Tastenhell" landeten die Prognose-Beträge damit
// bei 2,1:1 (soll 3), und weißer Text auf derselben Farbe als Kachel-
// Hintergrund bei 3,6:1 (soll 4,5).
// Auf hellen Themes wird deshalb nur leicht aufgehellt: sichtbar blasser,
// aber noch über der Schwelle.
export const blasserAkzent = (farbe = _state.current.blue) =>
  lightenHex(farbe, isLightTheme() ? 0.12 : 0.35);

// Ergebnis pro Theme + Untergrund gemerkt: die Funktion läuft sonst in jeder
// Budget-Zeile jedes Renders durch die Suche.
const _flaechenCache = new Map();

export function flaecheAbgesetzt(untergrund = _state.current.bg) {
  const surf = _state.current.surf;
  if (_lum(untergrund) == null) return surf;
  const schluessel = `${_state.current.themeName}|${untergrund}|${surf}`;
  if (_flaechenCache.has(schluessel)) return _flaechenCache.get(schluessel);

  let farbe = surf;
  const kSurf = _kontrast(untergrund, surf);
  if (kSurf == null || kSurf < MIN_KONTRAST) {
    // Suche den Mischanteil, der ZIEL_KONTRAST trifft. Der Kontrast wächst
    // monoton mit dem Anteil, deshalb genügt eine kurze Binärsuche — sie
    // trifft den Zielwert exakt, während eine geschlossene Formel den
    // Farbton des Untergrunds nicht mitnehmen würde (er soll erhalten
    // bleiben, ein Theme mit blaustichigem Grau behält seinen Stich).
    const hell = isLightTheme();
    const mische = (a) => hell ? darkenHex(untergrund, a) : lightenHex(untergrund, a);
    let lo = 0, hi = 1, best = mische(hell ? 0.2 : 0.25);
    for (let i = 0; i < 18; i++) {
      const a = (lo + hi) / 2;
      const c = mische(a);
      const k = _kontrast(untergrund, c);
      best = c;
      if (k == null) break;
      if (k < ZIEL_KONTRAST) lo = a; else hi = a;
    }
    farbe = best;
  }
  _flaechenCache.set(schluessel, farbe);
  return farbe;
}

// ── Zwei Textfarben: auf dem Hintergrund und auf Kartenflächen ──────────
//
// Bis hierher hatte die App EINE Textfarbe (`txt`/`txt2`/`lbl`) für beides.
// Für die allermeisten Themes stimmt das auch — Hintergrund und Karten liegen
// dort dicht beieinander. Es schließt aber jedes Motiv aus, das die beiden
// Flächen GEGENSÄTZLICH färbt: das Keyboard-Theme braucht dunkle Keycaps auf
// einer fast weißen Tastatur-Platte, also weißen Text auf den Karten und
// dunklen auf dem Hintergrund. Solange es nur eine Farbe gab, fiel zwangsläufig
// eine der beiden Seiten durch (Nutzer-Hinweis; im Browser nachgestellt: im
// Aufriss standen die Buchungszeilen weiß auf fast weiß).
//
// Ein Theme kann jetzt zusätzlich `txt_card`/`txt2_card`/`lbl_card` angeben.
// Tut es das, liefern `T.txt` & Co. eine CSS-Variable statt einer festen
// Farbe; die Wurzel setzt die Hintergrund-Werte, und `kartenTextRegel()`
// setzt auf jeder Kartenfläche die Karten-Werte. Da CSS-Variablen erben,
// bekommt jeder Text automatisch die Farbe der Fläche, auf der er liegt —
// ohne dass eine einzige der rund 1350 Aufrufstellen etwas davon wissen muss.
//
// Themes OHNE diese Angaben bleiben Zeichen für Zeichen unverändert; die
// Umschaltung greift ausschließlich dort, wo ein Theme sie anfordert.
const _TEXT_KEYS = { txt: "--txt", txt2: "--txt2", lbl: "--lbl" };

export const hatKartenText = (t = _state.current) => !!(t && t.txt_card);

// Werte für die Wurzel: die Farben für Text, der direkt auf `bg` liegt.
//
// `--amt-neutral` muss hier MIT hinein und darf nicht als `var(--txt)` auf der
// Wurzel stehen: ein `var()` innerhalb einer Custom Property wird schon dort
// aufgelöst, wo die Property DEKLARIERT ist — nicht dort, wo sie benutzt wird.
// Auf der Wurzel deklariert hätte jede Karte den Hintergrund-Wert geerbt, und
// genau das war zu sehen: weiße Kategorienamen, aber fast schwarze Beträge
// daneben (Nutzer-Hinweis).
export function wurzelTextVars(t = _state.current) {
  if (!hatKartenText(t)) return null;
  return { "--txt": t.txt, "--txt2": t.txt2, "--lbl": t.lbl, "--amt-neutral": t.txt };
}

// Farbwert → so, wie ihn der Browser ins style-Attribut zurückschreibt.
// Genau diese Schreibweise braucht der Selektor unten.
function _alsRgbText(c) {
  const h = String(c || "").trim();
  const m = h.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  const f = m[1].length === 3 ? m[1].split("").map(x => x + x).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

// Die CSS-Regel, die auf Kartenflächen die Karten-Textfarben setzt.
//
// Getroffen werden die Karten über ihre Hintergrundfarbe im style-Attribut.
// Das ist bewusst so: die Karten der App haben keine gemeinsame Klasse, und
// eine einzuführen hieße, dutzende Dateien anzufassen. Die Farben kommen aus
// dem Theme selbst, die Regel ist also nicht auf ein bestimmtes Theme fest
// verdrahtet.
export function kartenTextRegel(t = _state.current) {
  // Auch ohne eigene Karten-Textfarbe kann ein Theme etwas zu sagen haben:
  // `flaechen_extra` (Bereiche zu Karten erklaeren) und `card_shadow`
  // (Kartenkante) stehen fuer sich.
  if (!hatKartenText(t) && !t.flaechen_extra && !t.card_shadow) return "";
  const flaechen = [...new Set([t.surf, t.surf2, t.surf3, t.cat_bg]
    .map(_alsRgbText).filter(Boolean))];
  if (!flaechen.length) return "";
  const sel = flaechen.map(c => `[style*="${c}"]`).join(",");
  const txt2 = t.txt2_card || t.txt_card;
  const kartenVars = hatKartenText(t)
    ? `--txt:${t.txt_card};--txt2:${txt2};--lbl:${t.lbl_card || txt2};--amt-neutral:${t.txt_card};`
    : "";
  const deko = t.card_shadow ? `box-shadow:${t.card_shadow};` : "";
  let css = `${sel}{${kartenVars}${deko}}`;
  // `flaechen_extra`: Bereiche, die im Markup KEINE Karte sind, in einem
  // gegensätzlichen Theme aber eine sein müssen — Hero und Symbolzeile tragen
  // Akzentfarben (Kontostand, Prognose, Warn-/Spar-/VM-Symbole), die auf einer
  // hellen Platte durchfallen. Sie zählen dann als Karte, bekommen deren
  // Textfarben mit und heben sich ab. Form: {"<Selektor>": "<Fläche>"}.
  //
  // `!important` ist hier nicht Bequemlichkeit, sondern Notwendigkeit: diese
  // Bereiche malen ihre Fläche als INLINE-Style (`style={{background:T.bg}}`
  // bei den bildschirmfüllenden Blättern), und ein Stylesheet verliert gegen
  // inline. Betroffen sind nur Themes, die `flaechen_extra` überhaupt
  // angeben — für alle anderen entsteht die Regel gar nicht erst.
  Object.entries(t.flaechen_extra || {}).forEach(([sel2, flaeche]) => {
    css += `${sel2}{background:${flaeche} !important;${kartenVars}${deko}}`;
  });
  return css;
}

// Proxy verhält sich wie das aktuelle Theme-Objekt
export const theme = new Proxy({}, {
  get(_, key) {
    const t = _state.current;
    // Nur bei Themes mit eigener Karten-Textfarbe: Variable statt Festwert.
    // Der Rückfallwert ist die Hintergrund-Farbe — käme die Variable irgendwo
    // nicht an, steht dort dieselbe Farbe wie vor diesem Umbau.
    if (_TEXT_KEYS[key] && t.txt_card) return `var(${_TEXT_KEYS[key]}, ${t[key]})`;
    return t[key];
  },
  set(_, key, value) { _state.current[key] = value; return true; },
  ownKeys() { return Reflect.ownKeys(_state.current); },
  getOwnPropertyDescriptor(_, key) {
    return Object.getOwnPropertyDescriptor(_state.current, key);
  },
  has(_, key) { return key in _state.current; },
});
