import { describe, it, expect } from "vitest";
import { slugifyOrgName, generateOrgSlug } from "../org-slug";

// Mesma check do banco (orgs.slug).
const DB_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

describe("slugifyOrgName", () => {
  it("strips accents and lowercases", () => {
    expect(slugifyOrgName("Clínica Giselle")).toBe("clinica-giselle");
  });

  it("collapses non-alphanumerics into single hyphens, trimmed", () => {
    expect(slugifyOrgName("Açaí & Cia!!!")).toBe("acai-cia");
  });

  it("returns empty string for input with no latin alphanumerics", () => {
    expect(slugifyOrgName("工作室")).toBe("");
    expect(slugifyOrgName("  ---  ")).toBe("");
  });

  it("caps the base length at 40 chars without a trailing hyphen", () => {
    const out = slugifyOrgName("a".repeat(60));
    expect(out.length).toBe(40);
    expect(out.endsWith("-")).toBe(false);
  });
});

describe("generateOrgSlug", () => {
  it("starts from the slugified name and adds a suffix", () => {
    expect(generateOrgSlug("Clínica Giselle")).toMatch(/^clinica-giselle-[a-z0-9]{5}$/);
  });

  it("always produces a slug valid against the DB pattern", () => {
    for (const name of ["Clínica Giselle", "Açaí & Cia!!!", "工作室", "AB", "Studio 23"]) {
      expect(generateOrgSlug(name)).toMatch(DB_PATTERN);
    }
  });

  it("falls back to 'org' base when the name has no usable chars", () => {
    expect(generateOrgSlug("工作室")).toMatch(/^org-[a-z0-9]{5}$/);
  });

  it("produces different slugs across calls (uniqueness suffix)", () => {
    const a = generateOrgSlug("Clinica X");
    const b = generateOrgSlug("Clinica X");
    expect(a).not.toBe(b);
  });
});
