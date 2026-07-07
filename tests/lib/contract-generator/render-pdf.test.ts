import { describe, it, expect } from "vitest";
import { renderContractPdf } from "../../../lib/contract-generator/render-pdf";

describe("renderContractPdf", () => {
  it("gera um PDF não-vazio com header %PDF", async () => {
    const pdf = await renderContractPdf("<html><body><h1>Contrato Teste</h1></body></html>");
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 60000);
});
