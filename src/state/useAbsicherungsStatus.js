// Der Absicherungs-Stand als Hook — an zwei Stellen gebraucht.
//
// Der Satz auf der Startseite zeigt ihn, wenn etwas zu tun ist. Ist alles in
// Ordnung, zeigt er GAR NICHTS mehr, und stattdessen bekommt das Schild-Symbol
// in der Zeile darüber eine Umrandung (Nutzer-Wunsch: „Das grüne dauerhafte
// Banner nimmt dauerhaft Platz weg. Die Information, dass alles gut ist,
// möchte ich eher dezent sehen — als Umrandung oder ähnlich.").
//
// Beide Stellen brauchen also denselben Stand. Er steht deshalb hier und nicht
// in der Komponente — ein zweites Mal gerechnet wäre er irgendwann ein
// zweites, abweichendes Ergebnis.

import React, { useContext } from "react";
import { AppCtx } from "./AppContext.js";
import { useTagesgeldFrei } from "./useTagesgeldFrei.js";
import { absicherungsStatus } from "../utils/absicherung.js";

export function useAbsicherungsStatus() {
  const { txs, liquidityWarnings } = useContext(AppCtx);
  const tagesgeldFrei = useTagesgeldFrei();

  // Bis wann überhaupt gerechnet wurde: der späteste Monat mit Vormerkungen.
  const horizontBis = React.useMemo(() => {
    let max = null;
    (txs || []).forEach((t) => {
      if (!t.pending) return;
      const d = String(t.date).slice(0, 7);
      if (!max || d > max) max = d;
    });
    return max;
  }, [txs]);

  return React.useMemo(() => absicherungsStatus({
    warnungen: liquidityWarnings, tagesgeldFrei, horizontBis,
  }), [liquidityWarnings, tagesgeldFrei, horizontBis]);
}
