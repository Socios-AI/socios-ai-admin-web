import { describe, it, expect } from "vitest";
import { logoDataUri, fontFaceCss } from "../../../lib/contract-generator/assets";

describe("contract assets", () => {
  it("logoDataUri retorna PNG base64 não-trivial", () => {
    const uri = logoDataUri();
    expect(uri.startsWith("data:image/png;base64,")).toBe(true);
    expect(uri.length).toBeGreaterThan(10_000);
  });

  it("fontFaceCss embute as 3 famílias da marca como woff2 data URI", () => {
    const css = fontFaceCss();
    expect(css).toContain("@font-face");
    expect(css).toContain("data:font/woff2;base64,");
    expect(css).toContain('"Space Grotesk"');
    expect(css).toContain('"Plus Jakarta Sans"');
    expect(css).toContain('"DM Mono"');
  });
});
