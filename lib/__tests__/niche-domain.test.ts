import { describe, it, expect } from "vitest";
import { resolveNicheHost } from "../niche-domain";

describe("resolveNicheHost", () => {
  it("returns the niche-specific host when present", () => {
    const meta = { niche_domains: { clinica_estetica: "https://estetica.example.com" } };
    expect(resolveNicheHost(meta, "clinica_estetica", "https://fallback.example.com")).toBe(
      "https://estetica.example.com",
    );
  });

  it("falls back to metadata fallback then appFallback", () => {
    expect(resolveNicheHost({ niche_domain_fallback: "https://meta.example.com" }, null, "https://app.example.com")).toBe(
      "https://meta.example.com",
    );
    expect(resolveNicheHost(null, "x", "https://app.example.com")).toBe("https://app.example.com");
  });
});
