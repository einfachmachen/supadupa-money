import { describe, it, expect, beforeEach } from "vitest";
import { migrateLegacyLocalStorage } from "../src/state/persistence.js";

describe("migrateLegacyLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("entfernt isLand aus dem alten Format", () => {
    localStorage.setItem("finanzapp_v9", JSON.stringify({ isLand: true, foo: "bar" }));
    migrateLegacyLocalStorage();
    const after = JSON.parse(localStorage.getItem("finanzapp_v9"));
    expect(after.isLand).toBeUndefined();
    expect(after.foo).toBe("bar");
  });

  it("schluckt fehlendes localStorage-Item geräuschlos", () => {
    expect(() => migrateLegacyLocalStorage()).not.toThrow();
  });

  it("schluckt invalides JSON geräuschlos", () => {
    localStorage.setItem("finanzapp_v9", "kaputt{");
    expect(() => migrateLegacyLocalStorage()).not.toThrow();
  });
});
