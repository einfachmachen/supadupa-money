// Lizenz-Zustand der App: freischalten, merken, erneuern, abfragen.
//
// Wird EINMAL in App.jsx aufgerufen und über den AppCtx verteilt. Nicht
// mehrfach aufrufen: jeder Aufruf hätte seinen eigenen React-Zustand, und
// nach einem Freischalten wüsste nur die eine Stelle davon.

import { useState, useCallback, useEffect, useRef } from "react";
import {
  loadLocalToken, saveLocalToken, clearLocalToken, decodeToken, brauchtErneuerung,
  loadLocalCode, saveLocalCode, clearLocalCode,
} from "../utils/licenseToken.js";
import { hasFeature as pruefeFeature } from "../utils/licenseFeatures.js";

// Der Lizenzserver (worker/license-worker.js, Cloudflare).
const WORKER_URL = "https://lizenzen.supadupa.workers.dev";

// Diese App fragt für sich, nicht für spätere SupaDupa-Apps — der Worker
// prüft den Wert gegen `products` im Lizenzeintrag.
const PRODUCT = "money";

// Die Fehlerschlüssel des Workers in Sätze übersetzen, die im Dialog stehen
// können. Alles Unbekannte bekommt einen neutralen Satz statt eines rohen
// Schlüssels.
const FEHLER_TEXT = {
  license_not_found: "Diesen Lizenzcode kennen wir nicht. Bitte prüfe die Schreibweise.",
  license_expired: "Diese Lizenz ist abgelaufen.",
  product_not_licensed: "Dieser Code gilt für eine andere SupaDupa-App.",
  missing_license_code: "Bitte gib einen Lizenzcode ein.",
  secret_not_configured: "Der Lizenzserver ist nicht vollständig eingerichtet.",
  kv_not_configured: "Der Lizenzserver ist nicht vollständig eingerichtet.",
};

// Antworten, nach denen ein erneuter Versuch sinnlos ist: die Lizenz gibt es
// nicht mehr. Alles andere (offline, Serverfehler) darf es später nochmal
// probieren, statt den Nutzer auszusperren.
const ENDGUELTIG = new Set(["license_not_found", "license_expired", "product_not_licensed"]);

async function frageServer(code) {
  const res = await fetch(`${WORKER_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ licenseCode: code, product: PRODUCT }),
  });
  // Auch der Fehlerfall liefert JSON — verlassen darf man sich darauf nicht
  // (ein Ausfall der Plattform antwortet mit HTML).
  let body = null;
  try { body = await res.json(); } catch (e) { body = null; }
  return { res, body };
}

export function useLicense() {
  // kvStore ist beim ersten Rendern bereits geladen (main.jsx rendert erst
  // nach kvStore.init()), deshalb direkt im Initialisierer lesen statt per
  // useEffect nachzureichen — sonst blitzt beim Start kurz „nicht
  // freigeschaltet" auf, obwohl eine Lizenz hinterlegt ist.
  const [lizenzDaten, setLizenzDaten] = useState(() => loadLocalToken()?.data || null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  const uebernehmen = useCallback((token, code) => {
    if (!token || !saveLocalToken(token)) return false;
    if (code) saveLocalCode(code);
    setLizenzDaten(decodeToken(token).payload);
    return true;
  }, []);

  const freischalten = useCallback(async (code) => {
    const sauber = String(code || "").trim();
    if (!sauber) {
      setFehler(FEHLER_TEXT.missing_license_code);
      return { ok: false };
    }

    setLaeuft(true);
    setFehler("");
    try {
      const { res, body } = await frageServer(sauber);

      if (!res.ok) {
        const text = FEHLER_TEXT[body?.error] || body?.message
          || `Der Lizenzserver antwortet nicht wie erwartet (${res.status}).`;
        setFehler(text);
        return { ok: false, fehler: text };
      }

      if (!uebernehmen(body?.token, sauber)) {
        const text = "Der Lizenzserver hat kein verwertbares Token geliefert.";
        setFehler(text);
        return { ok: false, fehler: text };
      }
      return { ok: true };
    } catch (e) {
      // Netzwerkfehler: offline, DNS, abgebrochene Verbindung.
      const text = "Keine Verbindung zum Lizenzserver. Bist Du online?";
      setFehler(text);
      return { ok: false, fehler: text };
    } finally {
      setLaeuft(false);
    }
  }, [uebernehmen]);

  // ── Stille Erneuerung ────────────────────────────────────────────────
  // Das Token gilt 30 Tage. Ohne diesen Schritt fiele JEDER zahlende Nutzer
  // nach einem Monat wortlos auf „frei" zurück und müsste seinen Code erneut
  // eintippen — der Code wurde vorher nicht einmal gespeichert.
  //
  // Läuft genau einmal je Start, ohne Anzeige: schlägt sie fehl, weil das
  // Gerät offline ist, bleibt alles, wie es war. Nur wenn der Server die
  // Lizenz ausdrücklich verwirft (gelöscht, abgelaufen, falsche App), wird
  // hier aufgeräumt — sonst würde die App es bei jedem Start erneut
  // versuchen und der Nutzer bekäme nie eine Erklärung.
  const schonVersucht = useRef(false);
  useEffect(() => {
    if (schonVersucht.current) return;
    schonVersucht.current = true;

    const code = loadLocalCode();
    if (!code) return;
    const gespeichert = loadLocalToken();
    if (gespeichert && !brauchtErneuerung(gespeichert.data)) return;

    let abgebrochen = false;
    (async () => {
      try {
        const { res, body } = await frageServer(code);
        if (abgebrochen) return;
        if (res.ok) { uebernehmen(body?.token, code); return; }
        if (ENDGUELTIG.has(body?.error)) {
          clearLocalToken();
          clearLocalCode();
          setLizenzDaten(null);
          setFehler(FEHLER_TEXT[body.error] || "");
        }
      } catch (e) {
        // Offline: nichts tun. Das vorhandene Token gilt weiter, bis es
        // wirklich abgelaufen ist.
      }
    })();
    return () => { abgebrochen = true; };
  }, [uebernehmen]);

  const entfernen = useCallback(() => {
    clearLocalToken();
    clearLocalCode();
    setLizenzDaten(null);
    setFehler("");
  }, []);

  const hasFeature = useCallback(
    (feature) => pruefeFeature(lizenzDaten, feature),
    [lizenzDaten]
  );

  return {
    lizenzDaten,
    istFreigeschaltet: !!lizenzDaten,
    tier: lizenzDaten?.tier || "free",
    lizenzMail: lizenzDaten?.email || "",
    lizenzBis: lizenzDaten?.exp || 0,
    hasFeature,
    freischalten,
    lizenzEntfernen: entfernen,
    lizenzLaeuft: laeuft,
    lizenzFehler: fehler,
  };
}
