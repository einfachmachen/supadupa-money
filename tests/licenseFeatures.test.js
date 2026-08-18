// Stufenmodell (src/utils/licenseFeatures.js).
//
// Der Wert dieser Tests liegt weniger in den Einzelwerten als in einer
// Eigenschaft, die man beim Hinzufuegen einer Stufe leicht verletzt: die
// Leiter darf nach oben nichts VERLIEREN. Wer "promax" kauft und dabei
// cloud_sync einbuesst, weil die Liste haendisch getippt wurde, merkt es
// sonst erst der Kunde.

import { describe, it, expect } from "vitest";
import {
  TIER_ORDER, TIER_FEATURES, TIER_LABEL, FEATURES,
  wunschStufe, tierHasFeature, hasFeature,
} from "../src/utils/licenseFeatures.js";

describe("Lizenz-Stufenmodell", () => {
  it("jede Stufe ist definiert und beschriftet", () => {
    for (const t of TIER_ORDER) {
      expect(TIER_FEATURES[t], `${t} hat keine Faehigkeitsliste`).toBeDefined();
      expect(TIER_LABEL[t], `${t} hat keine Beschriftung`).toBeTruthy();
    }
    // Keine Stufe in der Tabelle, die nicht auch in der Leiter steht.
    expect(Object.keys(TIER_FEATURES).sort()).toEqual([...TIER_ORDER].sort());
  });

  it("die Leiter verliert nach oben nichts", () => {
    for (let i = 1; i < TIER_ORDER.length; i++) {
      const drunter = TIER_FEATURES[TIER_ORDER[i - 1]];
      const drauf = TIER_FEATURES[TIER_ORDER[i]];
      expect(drauf, `${TIER_ORDER[i]} verliert etwas gegenueber ${TIER_ORDER[i - 1]}`)
        .toEqual(expect.arrayContaining(drunter));
    }
  });

  it("free schaltet nichts frei", () => {
    expect(TIER_FEATURES.free).toEqual([]);
  });

  it("jede vergebene Faehigkeit ist auch beschrieben", () => {
    const vergeben = new Set(Object.values(TIER_FEATURES).flat());
    for (const f of vergeben) {
      expect(FEATURES[f], `${f} fehlt in FEATURES`).toBeDefined();
      expect(FEATURES[f].label).toBeTruthy();
      // Der Vermerk trennt echten Schutz von blossem Wegweiser — ohne ihn
      // haengt spaeter versehentlich etwas Schuetzenswertes hinter einem
      // weichen Tor.
      expect(["server", "weich"]).toContain(FEATURES[f].schutz);
    }
  });

  it("der Bankabruf ist serverseitig geschuetzt, Cloud-Sync bewusst nur weich", () => {
    expect(FEATURES.bank_connect.schutz).toBe("server");
    expect(FEATURES.cloud_sync.schutz).toBe("weich");
  });

  it("wunschStufe nennt die NIEDRIGSTE Stufe, nicht irgendeine", () => {
    // Zum Start traegt `premium` alles Kostenpflichtige — beide Faehigkeiten
    // also ab Premium. `pro`/`promax` sind reserviert und heute
    // deckungsgleich; wunschStufe darf sie deshalb NICHT nennen.
    expect(wunschStufe("cloud_sync")).toBe("premium");
    expect(wunschStufe("bank_connect")).toBe("premium");
    expect(wunschStufe("gibtsnicht")).toBeNull();
  });

  it("premium traegt zum Start ALLES Kostenpflichtige", () => {
    // Sonst bekaemen die ersten zahlenden Nutzer genau die Funktion nicht,
    // fuer die sie zahlen (der Bankabruf lag zuerst auf `pro`).
    const bezahlt = Object.keys(FEATURES);
    expect(TIER_FEATURES.premium).toEqual(expect.arrayContaining(bezahlt));
  });

  it("tierHasFeature trennt frei von bezahlt", () => {
    expect(tierHasFeature("free", "cloud_sync")).toBe(false);
    expect(tierHasFeature("free", "bank_connect")).toBe(false);
    expect(tierHasFeature("premium", "cloud_sync")).toBe(true);
    expect(tierHasFeature("premium", "bank_connect")).toBe(true);
    expect(tierHasFeature("pro", "bank_connect")).toBe(true);
    expect(tierHasFeature("promax", "bank_connect")).toBe(true);
    // Unbekannte Stufe darf nicht durchrutschen.
    expect(tierHasFeature("phantasie", "bank_connect")).toBe(false);
  });

  it("ohne Lizenz ist nichts frei", () => {
    expect(hasFeature(null, "cloud_sync")).toBe(false);
    expect(hasFeature(undefined, "bank_connect")).toBe(false);
    expect(hasFeature({}, "bank_connect")).toBe(false);
    expect(hasFeature({ tier: "" }, "bank_connect")).toBe(false);
  });

  it("hasFeature liest die Stufe aus der Token-Nutzlast", () => {
    const premium = { email: "a@b.c", tier: "premium", products: ["money"] };
    const frei = { email: "a@b.c", tier: "free", products: [] };
    expect(hasFeature(premium, "bank_connect")).toBe(true);
    expect(hasFeature(premium, "cloud_sync")).toBe(true);
    expect(hasFeature(frei, "bank_connect")).toBe(false);
    expect(hasFeature(frei, "cloud_sync")).toBe(false);
  });
});
