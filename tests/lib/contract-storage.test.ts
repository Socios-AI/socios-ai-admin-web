import { describe, it, expect, vi, beforeEach } from "vitest";

const upload = vi.fn();
const createSignedUrl = vi.fn();
vi.mock("@socios-ai/auth/admin", () => ({
  getSupabaseAdminClient: () => ({
    storage: { from: () => ({ upload, createSignedUrl }) },
  }),
}));

import { storeGeneratedPdf, getContractPreviewUrl } from "../../lib/contract-storage";

beforeEach(() => { upload.mockReset(); createSignedUrl.mockReset(); });

describe("contract-storage", () => {
  it("storeGeneratedPdf sobe no path generated/<id>.pdf", async () => {
    upload.mockResolvedValue({ data: { path: "generated/c1.pdf" }, error: null });
    const path = await storeGeneratedPdf("c1", Buffer.from("x"));
    expect(path).toBe("generated/c1.pdf");
    expect(upload).toHaveBeenCalledWith("generated/c1.pdf", expect.any(Buffer), expect.objectContaining({ contentType: "application/pdf", upsert: true }));
  });

  it("storeGeneratedPdf lança em erro do storage", async () => {
    upload.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(storeGeneratedPdf("c1", Buffer.from("x"))).rejects.toThrow("boom");
  });

  it("getContractPreviewUrl retorna signedUrl", async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://s/x" }, error: null });
    const url = await getContractPreviewUrl("generated/c1.pdf");
    expect(url).toBe("https://s/x");
    expect(createSignedUrl).toHaveBeenCalledWith("generated/c1.pdf", 300);
  });
});
