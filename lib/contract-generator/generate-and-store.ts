import { buildContractPayload } from "./build-payload";
import { renderContractHtml } from "./render-html";
import { renderContractPdf } from "./render-pdf";
import { storeGeneratedPdf } from "../contract-storage";
import type { BuildContractInput, ContractCountry } from "./types";

export type GenerateResult =
  | { ok: true; storagePath: string; payloadHash: string; payload: unknown; country: ContractCountry; templateVersion: string }
  | { ok: false; reason: string; message: string };

export async function generateAndStoreContract(args: {
  contractId: string;
  input: BuildContractInput;
}): Promise<GenerateResult> {
  const built = buildContractPayload(args.input);
  if (!built.ok) return { ok: false, reason: built.reason, message: built.message };

  try {
    const html = renderContractHtml(built.payload, { country: built.country, addenda: built.addenda });
    const pdf = await renderContractPdf(html, { documentId: built.payload.agreement.document_id });
    const storagePath = await storeGeneratedPdf(args.contractId, pdf);
    return {
      ok: true,
      storagePath,
      payloadHash: built.payloadHash,
      payload: built.payload,
      country: built.country,
      templateVersion: built.payload.agreement.version,
    };
  } catch (e) {
    return { ok: false, reason: "GENERATION_FAILED", message: e instanceof Error ? e.message : String(e) };
  }
}
