// Was heute auf dem Tagesgeld liegt und für einen Engpass verfügbar wäre.
//
// An zwei Stellen gebraucht — im Absicherungs-Satz auf der Startseite und in
// der Vorwarnung beim Anlegen einer Vormerkung. Zwei eigene Rechnungen dafür
// wären genau der Fehler, der uns bei Vorschau und Automatik schon einmal
// eingeholt hat: Sie liefen auseinander, und niemand sah es.
//
// „Verfügbar" heißt: Kontostand minus Notgroschen. Der Notgroschen
// (`mbt_tg_notgroschen`) ist der Betrag, den die App nie einplant und nie
// zurückholt — bis das Eingabefeld dafür existiert, steht er auf 0, dann gilt
// der ganze Bestand als verfügbar.
//
// `null` heißt „kein Tagesgeldkonto zugeordnet" — dann lässt sich über das
// Zurückholen nichts sagen, und der Aufrufer muss das auch so schreiben.

import React, { useContext } from "react";
import { AppCtx } from "./AppContext.js";
import { kvStore } from "../utils/kvStore.js";
import { saldoIst } from "../utils/saldo.js";

export function tagesgeldKontoId() {
  // Das Zielkonto des Sparplans ist die naheliegende Quelle: Dorthin fließt
  // das Geld, von dort kommt es zurück.
  return kvStore.getItem("mbt_spar_accid") || "";
}

export function useTagesgeldFrei() {
  const { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth } = useContext(AppCtx);
  const tgAccId = tagesgeldKontoId();
  const notgroschen = parseInt(kvStore.getItem("mbt_tg_notgroschen") || "0", 10) || 0;
  return React.useMemo(() => {
    if (!tgAccId || !(accounts || []).some((a) => a.id === tgAccId)) return null;
    try {
      const heute = new Date();
      const ctx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
      const stand = saldoIst(heute.getFullYear(), heute.getMonth(), heute.getDate(), tgAccId, ctx);
      if (stand === null || stand === undefined) return null;
      return stand - notgroschen;
    } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, cats, accounts, tgAccId, notgroschen]);
}
