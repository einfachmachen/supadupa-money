import { describe, it, expect } from "vitest";
import { cloudFingerprint } from "../src/utils/cloudFingerprint.js";

describe("cloudFingerprint", () => {
  it("liefert für identische URL+Secret denselben Fingerabdruck", async () => {
    const a = await cloudFingerprint("https://sync.example.workers.dev", "geheim123");
    const b = await cloudFingerprint("https://sync.example.workers.dev", "geheim123");
    expect(a).toBe(b);
    expect(a).toHaveLength(6);
  });

  it("liefert unterschiedliche Fingerabdrücke für unterschiedliche URLs (gleiches Secret)", async () => {
    const a = await cloudFingerprint("https://sync-alt.example.workers.dev", "geheim123");
    const b = await cloudFingerprint("https://sync-neu.example.workers.dev", "geheim123");
    expect(a).not.toBe(b);
  });

  it("liefert unterschiedliche Fingerabdrücke für unterschiedliche Secrets (gleiche URL)", async () => {
    const a = await cloudFingerprint("https://sync.example.workers.dev", "geheim-alt");
    const b = await cloudFingerprint("https://sync.example.workers.dev", "geheim-neu");
    expect(a).not.toBe(b);
  });

  it("ignoriert einen trailing Slash in der URL", async () => {
    const a = await cloudFingerprint("https://sync.example.workers.dev", "geheim123");
    const b = await cloudFingerprint("https://sync.example.workers.dev/", "geheim123");
    expect(a).toBe(b);
  });

  it("liefert einen leeren String, wenn URL oder Secret fehlen", async () => {
    expect(await cloudFingerprint("", "geheim123")).toBe("");
    expect(await cloudFingerprint("https://sync.example.workers.dev", "")).toBe("");
  });
});
