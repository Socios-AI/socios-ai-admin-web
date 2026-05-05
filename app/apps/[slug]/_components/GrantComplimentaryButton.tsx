"use client";

import { useState } from "react";
import { GrantComplimentaryModal } from "./GrantComplimentaryModal";

export function GrantComplimentaryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
      >
        Grant complimentary
      </button>
      {open && <GrantComplimentaryModal onClose={() => setOpen(false)} />}
    </>
  );
}
