"use client";

import { useTransition, useState, useRef } from "react";
import { requestProfileCompletionAction, type RequestCompletionResult } from "@/app/_actions/request-profile-completion";

export function RequestCompletionButton({ partnerId }: { partnerId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RequestCompletionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await requestProfileCompletionAction({ partnerId });
      setResult(res);
    });
  }

  function handleCopy() {
    if (result && result.ok && inputRef.current) {
      inputRef.current.select();
      navigator.clipboard.writeText(result.completeUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button
          onClick={handleClick}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-50"
        >
          {isPending ? "Gerando link..." : "Pedir complemento de cadastro"}
        </button>
      </div>

      {result && !result.ok && (
        <p className="text-sm text-destructive">Erro: {result.error}</p>
      )}

      {result && result.ok && (
        <div className="rounded-md border bg-muted/40 p-4 space-y-3 text-sm">
          <p className="font-medium">
            {result.emailSent
              ? "Email enviado ao parceiro."
              : "Email não enviado (verifique RESEND_API_KEY/EMAIL_FROM_* no ambiente). Copie o link abaixo e envie manualmente:"}
          </p>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              readOnly
              value={result.completeUrl}
              className="flex-1 rounded border bg-background px-3 py-1.5 font-mono text-xs focus:outline-none"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="shrink-0 rounded border px-3 py-1.5 text-xs hover:bg-accent"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
