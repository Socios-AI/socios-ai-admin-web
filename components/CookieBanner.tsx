"use client";

import { useEffect, useState } from "react";
import { CONSENT_COOKIE_NAME, CONSENT_COOKIE_OPTIONS, parseConsent } from "@/lib/cookie-consent";

function readConsentFromBrowser(): ReturnType<typeof parseConsent> {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  try {
    return parseConsent(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function writeConsent(value: "granted" | "denied"): void {
  if (typeof document === "undefined") return;
  const opts = CONSENT_COOKIE_OPTIONS;
  const parts = [
    `${CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}`,
    `Path=${opts.path}`,
    `Domain=${opts.domain}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite[0].toUpperCase()}${opts.sameSite.slice(1)}`,
    opts.secure ? "Secure" : "",
  ].filter(Boolean);
  document.cookie = parts.join("; ");
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsentFromBrowser() === null);
  }, []);

  if (!visible) return null;

  function decide(value: "granted" | "denied") {
    writeConsent(value);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <p className="text-sm text-foreground flex-1">
          Usamos um cookie de atribuição (sai_ref) quando você chega via link de parceiro,
          para creditar comissões corretamente. Sem ele, indicações não são rastreadas.{" "}
          <a href="https://id.sociosai.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">
            Saiba mais
          </a>
          .
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => decide("denied")}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={() => decide("granted")}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
