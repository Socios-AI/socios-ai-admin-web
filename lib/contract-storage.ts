import { getSupabaseAdminClient } from "@socios-ai/auth/admin";

const BUCKET = "partner-contracts";

async function uploadPdf(path: string, pdf: Buffer): Promise<string> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.storage.from(BUCKET).upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error || !data) throw new Error(error?.message ?? "upload failed");
  return data.path;
}

export function storeGeneratedPdf(contractId: string, pdf: Buffer): Promise<string> {
  return uploadPdf(`generated/${contractId}.pdf`, pdf);
}

export function storeSignedPdf(contractId: string, pdf: Buffer): Promise<string> {
  return uploadPdf(`signed/${contractId}.pdf`, pdf);
}

export async function getContractPreviewUrl(storagePath: string): Promise<string> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(storagePath, 300);
  if (error || !data) throw new Error(error?.message ?? "signed url failed");
  return data.signedUrl;
}
