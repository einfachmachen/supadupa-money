#!/usr/bin/env node
// Kontrast-Pruefung der gebauten App im echten Browser.
//
// WARUM ES DAS GIBT
// Farbprobleme fallen in dieser App nicht beim Bauen auf und auch nicht in den
// Unit-Tests: sie entstehen erst aus der Kombination von Theme, Flaeche,
// Betrags-Modus und Nutzerdaten. Genau deshalb war jede frueherere Pruefung ein
// Wegwerf-Skript, das zwei Bildschirme in einem Zustand ansah und prompt das
// Wesentliche uebersah (Nutzer-Hinweis: "Dein Kontrast-Check muss noch besser
// werden"). Dieses Werkzeug ist der Ersatz: fest im Repo, wiederholbar, ueber
// alle Bildschirme, alle Betrags-Modi und beliebige Themes.
//
// AUFRUF
//   npm run build && npx vite preview --port 5199 --strictPort &
//   node tools/kontrast.cjs                     # Standard-Themes
//   node tools/kontrast.cjs keyboard            # nur eines
//   node tools/kontrast.cjs --alle              # alle Themes
//   node tools/kontrast.cjs --bilder            # zusaetzlich Screenshots
//
// Rueckgabewert: 1, sobald eine Stelle gefunden wird, die dem THEME gehoert.
// Stellen, die aus Nutzerdaten stammen (selbst gewaehlte Kategorie- und
// Kontofarben), werden getrennt ausgewiesen und schlagen NICHT fehl — sie
// lassen sich vom Theme aus nicht beheben.
//
// WAS GEPRUEFT WIRD
//   - Text gegen seinen tatsaechlichen Untergrund (alle gemalten Ebenen
//     uebereinandergelegt, halbtransparente Chips zaehlen mit)
//   - SVG-Symbole (haben keinen Textknoten und fielen frueher durch)
//   - Schwellen nach WCAG: 4,5:1 fuer Text, 3:1 fuer grossen Text und Symbole

const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const URL = process.env.URL || "http://localhost:5199/";
const ORDNER = path.join(__dirname, "..", ".kontrast");
const args = process.argv.slice(2);
const BILDER = args.includes("--bilder");
const ALLE = args.includes("--alle");
const NUR = args.filter(a => !a.startsWith("--"));

// Standard-Auswahl: die Extreme des Farbraums plus die Sonderfaelle.
const STANDARD = ["dark", "light", "keyboard", "kontrastdunkel", "kontrasthell", "terminal"];

// ── Der Scan laeuft IM Browser ──────────────────────────────────────────────
const SCAN = () => {
  const parse = c => {
    const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
  };
  const lum = ([r, g, b]) => {
    const s = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  };
  const kon = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const ueber = (fg, bg) => { const a = fg[3]; return [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a)); };

  // Untergrund = ALLE gemalten Ebenen von der Wurzel nach unten uebereinander.
  // Der frueherere "naechster undurchsichtiger Vorfahre" lag falsch, sobald eine
  // halbtransparente Flaeche dazwischenlag (Chips, getoente Karten).
  const bgVon = el => {
    const kette = []; let n = el;
    while (n && n !== document.documentElement) { kette.push(n); n = n.parentElement; }
    let bg = [255, 255, 255];
    kette.reverse().forEach(k => {
      const c = parse(getComputedStyle(k).backgroundColor);
      if (c && c[3] > 0) bg = ueber(c, bg);
    });
    return bg;
  };
  const sichtbar = el => {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) return false;
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < 0.2) return false;
      n = n.parentElement;
    }
    return true;
  };

  const funde = [];
  document.querySelectorAll("*").forEach(el => {
    if (!sichtbar(el)) return;
    const cs = getComputedStyle(el);
    const bg = bgVon(el);
    const bgTxt = `rgb(${bg.map(Math.round).join(", ")})`;

    const txt = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    if (txt.length) {
      const fg = parse(cs.color);
      if (fg && fg[3] > 0.15) {
        const gross = parseFloat(cs.fontSize) >= 24
          || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
        const soll = gross ? 3 : 4.5;
        const k = kon(ueber(fg, bg), bg);
        if (k < soll) funde.push({ art: "Text", was: txt.map(n => n.textContent.trim()).join(" ").slice(0, 34),
          k: +k.toFixed(2), soll, fg: cs.color, bg: bgTxt });
      }
    }

    // Symbole: Strich- bzw. Fuellfarbe. Ohne diesen Zweig blieben genau die
    // Warn-/Spar-/VM-Symbole unentdeckt, die der Nutzer gemeldet hat.
    if (el.tagName.toLowerCase() === "svg") {
      const roh = cs.stroke && cs.stroke !== "none" ? cs.stroke : cs.fill;
      const fg = parse(roh);
      if (fg && fg[3] > 0.15) {
        const k = kon(ueber(fg, bg), bg);
        if (k < 3) funde.push({ art: "Symbol", was: (el.getAttribute("class") || "svg").replace(/lucide\s*/g, "").slice(0, 34),
          k: +k.toFixed(2), soll: 3, fg: roh, bg: bgTxt });
      }
    }
  });

  // Gleiche Farbkombination nur einmal — sonst meldet eine Liste dasselbe 30x.
  const gesehen = new Set();
  return funde.filter(f => { const s = f.art + f.fg + f.bg; if (gesehen.has(s)) return false; gesehen.add(s); return true; });
};

// ── Stationen: Bildschirme und Zustaende, die durchlaufen werden ────────────
async function stationen(page, merke) {
  const klickAuge = async () => {
    const a = await page.evaluate(() => {
      const el = [...document.querySelectorAll("div,span,button")].find(e =>
        /eye/i.test(e.innerHTML) && e.getBoundingClientRect().y < 90 && e.getBoundingClientRect().width < 60);
      if (!el) return null; const r = el.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    });
    if (a) { await page.mouse.click(a.x, a.y); await page.waitForTimeout(350); }
  };
  const tab = async (x) => { await page.mouse.click(210, 855); await page.waitForTimeout(500);
    await page.mouse.click(x, 862); await page.waitForTimeout(1400); };

  // Betrags-Modi: 0 unscharf → 1 neutral → 2 farbig. Modus 1 hat die
  // fast-schwarzen Betraege auf dunklen Karten sichtbar gemacht.
  await merke("Home · Betraege unscharf");
  await klickAuge();
  await merke("Home · Betraege neutral");
  await page.mouse.click(210, 92); await page.waitForTimeout(700);
  await merke("Home · Betraege farbig + Details");

  await tab(126); await merke("Monat");
  await tab(294); await merke("Trend");
  await tab(373); await merke("Daten");
  await tab(47);  await page.waitForTimeout(400);

  // Kategorie-Aufriss (Text steht dort direkt auf dem Hintergrund)
  const ziel = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div")].find(e => /^Lebenshaltung$/.test((e.textContent || "").trim()));
    if (!el) return null;
    const z = el.closest('div[style*="border-radius"]') || el.parentElement;
    const r = z.getBoundingClientRect();
    return { x: Math.round(r.right - 40), y: Math.round(r.y + r.height / 2) };
  });
  if (ziel) { await page.mouse.click(ziel.x, ziel.y); await page.waitForTimeout(1100); await merke("Kategorie-Aufriss"); }

  // Bearbeiten-Dialog + Rueckfrage (eigene Flaechen, eigene Farben)
  const buchung = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div")].find(e => /^REWE SAGT DANKE$/.test((e.textContent || "").trim()));
    if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + 40), y: Math.round(r.y + r.height / 2) };
  });
  if (buchung) {
    await page.mouse.click(buchung.x, buchung.y); await page.waitForTimeout(1100);
    await merke("Buchung bearbeiten");
    await page.mouse.wheel(0, 4000); await page.waitForTimeout(400);
    const geklickt = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button,div")]
        .filter(e => /^\s*Löschen\s*$/.test(e.textContent || ""))
        .filter(e => e.getBoundingClientRect().width > 0);
      if (!b.length) return false; b[b.length - 1].click(); return true;
    });
    if (geklickt) { await page.waitForTimeout(700); await merke("Rueckfrage (Löschen)"); }
  }
}

(async () => {
  const seed = fs.readFileSync(path.join(__dirname, "kontrast-seed.json"), "utf8");
  const daten = JSON.parse(seed);
  // Selbst gewaehlte Farben aus den Nutzerdaten — Funde mit diesen Farben
  // gehoeren NICHT dem Theme und koennen von dort auch nicht behoben werden.
  const nutzerFarben = new Set([
    ...(daten.cats || []).map(c => (c.color || "").toUpperCase()),
    ...(daten.accounts || []).map(a => (a.color || "").toUpperCase()),
  ].filter(Boolean));
  const alsRgb = h => { const x = h.replace("#", ""); return `rgb(${[0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)).join(", ")})`; };
  const nutzerRgb = new Set([...nutzerFarben].map(alsRgb));

  const { THEMES } = await import("../src/theme/themes.js");
  const themes = NUR.length ? NUR : (ALLE ? Object.keys(THEMES).filter(k => k !== "custom_preview") : STANDARD);
  if (BILDER) fs.mkdirSync(ORDNER, { recursive: true });

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  let themeFunde = 0, datenFunde = 0;

  for (const th of themes) {
    if (!THEMES[th]) { console.log(`\n### ${th}: unbekanntes Theme — uebersprungen`); continue; }
    const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: "dark" });
    const fehler = [];
    page.on("pageerror", e => fehler.push(e.message));
    await page.goto(URL); await page.waitForTimeout(900);
    await page.evaluate(async ([seedStr, name]) => {
      const db = await new Promise((res, rej) => {
        const req = indexedDB.open("supadupa-money", 2);
        req.onupgradeneeded = e => { const d = e.target.result;
          if (!d.objectStoreNames.contains("appdata")) d.createObjectStore("appdata");
          if (!d.objectStoreNames.contains("kvstore")) d.createObjectStore("kvstore"); };
        req.onsuccess = e => res(e.target.result); req.onerror = e => rej(e.target.error);
      });
      await new Promise((res, rej) => { const tx = db.transaction("appdata", "readwrite");
        tx.objectStore("appdata").put(seedStr, "finanzapp_v9"); tx.oncomplete = res; tx.onerror = rej; });
      await new Promise((res, rej) => { const tx = db.transaction("kvstore", "readwrite");
        tx.objectStore("kvstore").put(name, "mbt_theme"); tx.oncomplete = res; tx.onerror = rej; });
    }, [seed, th]);
    await page.reload(); await page.waitForTimeout(2300);

    console.log(`\n=== ${th} (${THEMES[th].name || th}) ===`);
    let n = 0;
    const merke = async (wo) => {
      const funde = await page.evaluate(SCAN);
      if (BILDER) await page.screenshot({ path: path.join(ORDNER, `${th}-${String(++n).padStart(2, "0")}.png`) });
      const vomTheme = funde.filter(f => !nutzerRgb.has(f.fg));
      const vonDaten = funde.filter(f => nutzerRgb.has(f.fg));
      themeFunde += vomTheme.length; datenFunde += vonDaten.length;
      if (vomTheme.length) {
        console.log(`  ${wo}:`);
        vomTheme.forEach(f => console.log(
          `    ${f.art.padEnd(6)} "${f.was}" ${String(f.k).padStart(5)}:1 (soll ${f.soll})  ${f.fg} auf ${f.bg}`));
      }
    };
    await stationen(page, merke);
    if (fehler.length) { console.log(`  !! ${fehler.length} Seitenfehler: ${fehler[0]}`); themeFunde += fehler.length; }
    await page.close();
  }
  await browser.close();

  console.log(`\n──────────────────────────────────────────────`);
  console.log(`Theme-eigene Stellen unter der Schwelle: ${themeFunde}`);
  console.log(`Aus Nutzerdaten (Kategorie-/Kontofarben): ${datenFunde}  — vom Theme aus nicht behebbar`);
  if (BILDER) console.log(`Bilder: ${ORDNER}`);
  process.exit(themeFunde ? 1 : 0);
})();
