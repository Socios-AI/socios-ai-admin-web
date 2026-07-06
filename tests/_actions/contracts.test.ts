import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requireSuperAdminAAL2 = vi.fn();
vi.mock("../../lib/auth", () => ({ requireSuperAdminAAL2: () => requireSuperAdminAAL2() }));

const update = vi.fn().mockReturnThis();
const eq = vi.fn().mockReturnThis();
const select = vi.fn().mockReturnThis();
const maybeSingle = vi.fn();
const insert = vi.fn().mockResolvedValue({ error: null });
const from = vi.fn(() => ({ update, eq, select, maybeSingle, insert }));
const download = vi.fn().mockResolvedValue({ data: { arrayBuffer: async () => new ArrayBuffer(8) }, error: null });
const storageFrom = vi.fn(() => ({ download }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: () => ({ from, storage: { from: storageFrom } }) }));
vi.mock("../../lib/contract-storage", () => ({ getContractPreviewUrl: vi.fn().mockResolvedValue("https://s/x") }));
const createSignatureRequestForContract = vi.fn();
vi.mock("../../lib/dropbox-sign-sync", () => ({ createSignatureRequestForContract: (...a: unknown[]) => createSignatureRequestForContract(...a) }));

import { approveAndSendContractAction, rejectContractAction } from "../../app/_actions/contracts";

beforeEach(() => { vi.clearAllMocks(); requireSuperAdminAAL2.mockResolvedValue({ claims: { sub: "admin-1" } }); });

describe("contracts actions", () => {
  it("approve exige AAL2", async () => {
    requireSuperAdminAAL2.mockResolvedValue(null);
    const r = await approveAndSendContractAction({ contractId: "c1" });
    expect(r).toEqual({ ok: false, error: "FORBIDDEN" });
  });

  it("approve envia ao Dropbox Sign e marca sent", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "pending_review", storage_path_generated: "generated/c1.pdf", partner_invitation_id: "inv-1" }, error: null });
    createSignatureRequestForContract.mockResolvedValue({ envelopeId: "sr_1" });
    const r = await approveAndSendContractAction({ contractId: "c1" });
    expect(r.ok).toBe(true);
    expect(createSignatureRequestForContract).toHaveBeenCalled();
  });

  it("reject marca rejected com motivo", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "pending_review" }, error: null });
    const r = await rejectContractAction({ contractId: "c1", reason: "dados errados" });
    expect(r.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "rejected", reject_reason: "dados errados" }));
  });
});
