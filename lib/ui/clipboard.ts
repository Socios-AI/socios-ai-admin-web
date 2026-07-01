"use client";

import { toast } from "sonner";

// Copy text to the clipboard with a toast confirmation.
// Falls back to a hidden textarea when the async Clipboard API is unavailable.
export async function copyToClipboard(
  text: string,
  message = "Link copiado",
): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    toast.success(message);
    return true;
  } catch {
    toast.error("Não foi possível copiar");
    return false;
  }
}
