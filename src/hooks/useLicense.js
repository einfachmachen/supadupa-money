// useLicense Hook: Lizenz-Zustand, Feature-Abfrage, Token-Verwaltung.
//
// Beim App-Start: Token aus localStorage laden (offline-tauglich)
// Beim Code eingeben: /verify aufrufen, Token speichern
// Abfrage: hasFeature("bank_connect") etc.

import { useState, useCallback, useEffect } from "react";
import { loadLocalToken, saveLocalToken, clearLocalToken, decodeToken, isTokenValid } from "../utils/licenseToken.js";
import { hasFeature as checkFeature } from "../utils/licenseFeatures.js";

const WORKER_URL = "https://lizenzen.supadupa.workers.dev";

export function useLicense() {
  const [licenseData, setLicenseData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Beim Mount: Token aus localStorage laden
  useEffect(() => {
    const stored = loadLocalToken();
    if (stored) {
      setLicenseData(stored.data);
    }
  }, []);

  // Code verifizieren
  const verify = useCallback(async (licenseCode) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${WORKER_URL}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseCode, product: "money" }),
      });

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }

      const body = await res.json();
      const token = body.token;

      // Token speichern und dekodieren
      if (saveLocalToken(token)) {
        const decoded = decodeToken(token);
        if (decoded) {
          setLicenseData(decoded.payload);
          return { success: true };
        }
      }
      throw new Error("Token speichern fehlgeschlagen");
    } catch (e) {
      setError(String(e.message));
      return { success: false, error: String(e.message) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    clearLocalToken();
    setLicenseData(null);
    setError(null);
  }, []);

  // Feature-Abfrage
  const hasFeature = useCallback((feature) => {
    return checkFeature(licenseData, feature);
  }, [licenseData]);

  // Ist freigeschaltet?
  const isLicensed = !!licenseData;

  // Email und Tier auslesen
  const email = licenseData?.email || null;
  const tier = licenseData?.tier || "free";

  return {
    licenseData,
    isLicensed,
    tier,
    email,
    hasFeature,
    verify,
    logout,
    isLoading,
    error,
  };
}
