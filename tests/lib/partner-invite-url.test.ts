import { describe, it, expect, afterEach } from "vitest";
import { partnerOnboardingUrl } from "../../lib/partner-invite-url";

describe("partnerOnboardingUrl", () => {
  const original = process.env.PARTNERS_WEB_BASE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.PARTNERS_WEB_BASE_URL;
    else process.env.PARTNERS_WEB_BASE_URL = original;
  });

  it("usa PARTNERS_WEB_BASE_URL e monta o caminho de onboarding", () => {
    process.env.PARTNERS_WEB_BASE_URL = "https://partners.example.com";
    expect(partnerOnboardingUrl("abc123")).toBe("https://partners.example.com/onboarding/abc123");
  });

  it("remove barra final da base", () => {
    process.env.PARTNERS_WEB_BASE_URL = "https://partners.example.com/";
    expect(partnerOnboardingUrl("tok")).toBe("https://partners.example.com/onboarding/tok");
  });

  it("cai no host padrão quando a env não está setada", () => {
    delete process.env.PARTNERS_WEB_BASE_URL;
    expect(partnerOnboardingUrl("tok")).toBe("https://partners.sociosai.com/onboarding/tok");
  });
});
