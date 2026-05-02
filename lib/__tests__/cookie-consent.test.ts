import { describe, it, expect } from "vitest";
import { parseConsent, readConsentFromCookie, CONSENT_COOKIE_NAME } from "../cookie-consent";

describe("parseConsent", () => {
  it("accepts granted and denied", () => {
    expect(parseConsent("granted")).toBe("granted");
    expect(parseConsent("denied")).toBe("denied");
  });

  it("rejects anything else", () => {
    expect(parseConsent("yes")).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
  });
});

describe("readConsentFromCookie", () => {
  it("returns null for missing header", () => {
    expect(readConsentFromCookie(null)).toBeNull();
    expect(readConsentFromCookie(undefined)).toBeNull();
    expect(readConsentFromCookie("")).toBeNull();
  });

  it("returns granted when consent=granted", () => {
    expect(readConsentFromCookie(`${CONSENT_COOKIE_NAME}=granted`)).toBe("granted");
    expect(readConsentFromCookie(`other=x; ${CONSENT_COOKIE_NAME}=granted; trailing=y`)).toBe("granted");
  });

  it("returns denied when consent=denied", () => {
    expect(readConsentFromCookie(`${CONSENT_COOKIE_NAME}=denied`)).toBe("denied");
  });

  it("matches name exactly", () => {
    expect(readConsentFromCookie("xsai_consent=granted")).toBeNull();
    expect(readConsentFromCookie("sai_consent_x=granted")).toBeNull();
  });
});
