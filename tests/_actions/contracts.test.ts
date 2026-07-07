import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requireSuperAdminAAL2 = vi.fn();
vi.mock("../../lib/auth", () => ({ requireSuperAdminAAL2: () => requireSuperAdminAAL2() }));

const update = vi.fn().mockReturnThis();
const eq = vi.fn().mockReturnThis();
const select = vi.fn().mockReturnThis();
const inFilter = vi.fn().mockReturnThis();
const order = vi.fn().mockReturnThis();
const maybeSingle = vi.fn();
const insert = vi.fn().mockResolvedValue({ error: null });
// A chained `.update(...).eq(...).eq(...).select("id")` (or without the trailing
// `.select()`, as in rejectContractAction) must itself be awaitable. Since
// update/eq/select all return `this` via mockReturnThis, we make the shared
// chain object thenable so `await` on it resolves via `updateSelect`.
// The same mechanism covers `.select(...).in(...).order(...)` used by
// listPendingContractsAction.
const updateSelect = vi.fn().mockResolvedValue({ data: [{ id: "c1" }], error: null });
const from = vi.fn(() => ({
  update,
  eq,
  select,
  in: inFilter,
  order,
  maybeSingle,
  insert,
  then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    updateSelect().then(resolve, reject),
}));
const download = vi.fn().mockResolvedValue({ data: { arrayBuffer: async () => new ArrayBuffer(8) }, error: null });
const storageFrom = vi.fn(() => ({ download }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: () => ({ from, storage: { from: storageFrom } }) }));
vi.mock("../../lib/contract-storage", () => ({ getContractPreviewUrl: vi.fn().mockResolvedValue("https://s/x") }));
const createSignatureRequestForContract = vi.fn();
vi.mock("../../lib/dropbox-sign-sync", () => ({ createSignatureRequestForContract: (...a: unknown[]) => createSignatureRequestForContract(...a) }));

import { approveAndSendContractAction, listPendingContractsAction, rejectContractAction } from "../../app/_actions/contracts";

beforeEach(() => {
  vi.clearAllMocks();
  requireSuperAdminAAL2.mockResolvedValue({ claims: { sub: "admin-1" } });
  updateSelect.mockResolvedValue({ data: [{ id: "c1" }], error: null });
});

describe("contracts actions", () => {
  it("approve exige AAL2", async () => {
    requireSuperAdminAAL2.mockResolvedValue(null);
    const r = await approveAndSendContractAction({ contractId: "c1" });
    expect(r).toEqual({ ok: false, error: "FORBIDDEN" });
  });

  it("approve envia ao Dropbox Sign e marca sent", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { id: "c1", status: "pending_review", storage_path_generated: "generated/c1.pdf", partner_invitation_id: "inv-1" }, error: null })
      .mockResolvedValueOnce({ data: { email: "a@b.com", full_name: "Ana" }, error: null });
    createSignatureRequestForContract.mockResolvedValue({ envelopeId: "sr_1" });
    const r = await approveAndSendContractAction({ contractId: "c1" });
    expect(r.ok).toBe(true);
    expect(createSignatureRequestForContract).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "sent", envelope_id: "sr_1" }));
  });

  it("approve com contrato fora de pending_review retorna INVALID_STATE e não chama Dropbox Sign", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { id: "c1", status: "sent", storage_path_generated: "generated/c1.pdf", partner_invitation_id: "inv-1" }, error: null });
    const r = await approveAndSendContractAction({ contractId: "c1" });
    expect(r).toEqual({ ok: false, error: "INVALID_STATE", message: "sent" });
    expect(createSignatureRequestForContract).not.toHaveBeenCalled();
  });

  it("approve quando Dropbox Sign rejeita retorna DROPBOX_SIGN_ERROR e não marca sent", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { id: "c1", status: "pending_review", storage_path_generated: "generated/c1.pdf", partner_invitation_id: "inv-1" }, error: null })
      .mockResolvedValueOnce({ data: { email: "a@b.com", full_name: "Ana" }, error: null });
    createSignatureRequestForContract.mockRejectedValue(new Error("boom"));
    const r = await approveAndSendContractAction({ contractId: "c1" });
    expect(r).toEqual({ ok: false, error: "DROPBOX_SIGN_ERROR", message: "boom" });
    expect(update).not.toHaveBeenCalled();
  });

  it("approve quando convite não tem e-mail retorna erro e não chama Dropbox Sign", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { id: "c1", status: "pending_review", storage_path_generated: "generated/c1.pdf", partner_invitation_id: "inv-1" }, error: null })
      .mockResolvedValueOnce({ data: { email: null, full_name: "Ana" }, error: null });
    const r = await approveAndSendContractAction({ contractId: "c1" });
    expect(r.ok).toBe(false);
    expect(createSignatureRequestForContract).not.toHaveBeenCalled();
  });

  it("reject marca rejected com motivo", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "pending_review" }, error: null });
    const r = await rejectContractAction({ contractId: "c1", reason: "dados errados" });
    expect(r.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "rejected", reject_reason: "dados errados" }));
  });

  it("reject com motivo vazio retorna VALIDATION", async () => {
    const r = await rejectContractAction({ contractId: "c1", reason: "" });
    expect(r).toEqual({ ok: false, error: "VALIDATION" });
  });

  it("listPendingContractsAction inclui pending_review e generation_failed", async () => {
    updateSelect.mockResolvedValueOnce({
      data: [
        {
          id: "c1",
          status: "pending_review",
          country: "BR",
          created_at: "2026-07-04T00:00:00Z",
          storage_path_generated: "generated/c1.pdf",
          partner_invitations: { email: "a@b.com", full_name: "Ana" },
        },
        {
          id: "c2",
          status: "generation_failed",
          country: "BR",
          created_at: "2026-07-04T00:00:00Z",
          storage_path_generated: null,
          partner_invitations: { email: "c@d.com", full_name: "Carlos" },
        },
      ],
      error: null,
    });
    const r = await listPendingContractsAction();
    expect(inFilter).toHaveBeenCalledWith("status", ["pending_review", "generation_failed"]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows.map((x) => x.status)).toEqual(["pending_review", "generation_failed"]);
    }
  });
});
