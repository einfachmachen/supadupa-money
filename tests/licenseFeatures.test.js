import { describe, it, expect } from "vitest";
import { TIER_FEATURES, requiredTier, tierHasFeature, hasFeature } from "../src/utils/licenseFeatures.js";

describe("Lizenz-Stufenmodell", () => {
  it("kennt die vier Stufen", () => {
    expect(Object.keys(TIER_FEATURES)).toEqual(["free", "premium", "pro", "promax"]);
  });

  it("free hat keine Fähigkeiten", () => {
    expect(TIER_FEATURES.free).toEqual([]);
  });

  it("premium hat cloud_sync", () => {
    expect(TIER_FEATURES.premium).toEqual(["cloud_sync"]);
  });

  it("pro hat cloud_sync und bank_connect", () => {
    expect(TIER_FEATURES.pro).toContain("cloud_sync");
    expect(TIER_FEATURES.pro).toContain("bank_connect");
  });

  it("promax hat mindestens das, was pro hat", () => {
    expect(TIER_FEATURES.promax).toEqual(expect.arrayContaining(TIER_FEATURES.pro));
  });

  it("requiredTier gibt die niedrigste Stufe für eine Fähigkeit", () => {
    expect(requiredTier("cloud_sync")).toBe("premium");
    expect(requiredTier("bank_connect")).toBe("pro");
    expect(requiredTier("nix")).toBeNull();
  });

  it("tierHasFeature prüft, ob eine Stufe eine Fähigkeit hat", () => {
    expect(tierHasFeature("free", "cloud_sync")).toBe(false);
    expect(tierHasFeature("premium", "cloud_sync")).toBe(true);
    expect(tierHasFeature("premium", "bank_connect")).toBe(false);
    expect(tierHasFeature("pro", "bank_connect")).toBe(true);
    expect(tierHasFeature("pro", "cloud_sync")).toBe(true);
  });

  it("hasFeature prüft licenseData", () => {
    const proData = { tier: "pro", products: ["money"] };
    const premiumData = { tier: "premium", products: ["money"] };
    const freeData = { tier: "free", products: [] };
    const noLicense = null;

    expect(hasFeature(proData, "bank_connect")).toBe(true);
    expect(hasFeature(premiumData, "bank_connect")).toBe(false);
    expect(hasFeature(freeData, "cloud_sync")).toBe(false);
    expect(hasFeature(noLicense, "cloud_sync")).toBe(false);
  });
});
