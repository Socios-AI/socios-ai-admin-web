import { describe, it, expect, vi } from "vitest";

vi.mock("../../../lib/contract-generator/render-pdf", () => ({
  renderContractPdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 fake")),
}));
const storeGeneratedPdf = vi.fn().mockResolvedValue("generated/c1.pdf");
vi.mock("../../../lib/contract-storage", () => ({ storeGeneratedPdf: (...a: unknown[]) => storeGeneratedPdf(...a) }));

import { generateAndStoreContract } from "../../../lib/contract-generator/generate-and-store";
import type { BuildContractInput } from "../../../lib/contract-generator/types";

const input: BuildContractInput = {
  invitationId: "inv-1",
  contractId: "92a6fe79-9ec9-442b-b0cc-aa825f2fc850",
  generatedDate: "2026-07-09",
  counterparty: { display_name: "X LTDA", email: "d@e.com", person_type: "company", country: "BR", tax_id: "11444777000161", tax_id_type: "cnpj", company_legal_name: "X LTDA" },
  licenseAmountUsd: 15000, territory: "Non-exclusive, no territorial restriction",
  commission: { negotiatedPct: null, recruitBonusPct: 0.5, residualOverridePct: 0.07 },
};

describe("generateAndStoreContract", () => {
  it("gera, renderiza e armazena; devolve path + hash", async () => {
    const r = await generateAndStoreContract({ contractId: "c1", input });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.storagePath).toBe("generated/c1.pdf");
    expect(r.payloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(storeGeneratedPdf).toHaveBeenCalledWith("c1", expect.any(Buffer));
  });

  it("propaga fail-closed do builder (território exclusivo)", async () => {
    const r = await generateAndStoreContract({ contractId: "c1", input: { ...input, territory: "Exclusive SP" } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("EXCLUSIVE_TERRITORY");
  });

  it("render falhando devolve ok:false (não lança)", async () => {
    const { renderContractPdf } = await import("../../../lib/contract-generator/render-pdf");
    (renderContractPdf as unknown as { mockRejectedValueOnce: (e: Error) => void }).mockRejectedValueOnce(new Error("chromium down"));
    const r = await generateAndStoreContract({ contractId: "c1", input });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("GENERATION_FAILED");
    expect(r.message).toContain("chromium down");
  });

  it("storage falhando devolve ok:false (não lança)", async () => {
    storeGeneratedPdf.mockRejectedValueOnce(new Error("bucket down"));
    const r = await generateAndStoreContract({ contractId: "c1", input });
    expect(r.ok).toBe(false);
  });
});
