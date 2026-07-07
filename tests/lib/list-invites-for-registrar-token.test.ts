import { describe, it, expect, vi, beforeEach } from "vitest";

const { adminClientMock } = vi.hoisted(() => ({ adminClientMock: vi.fn() }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));

import { listInvitesForRegistrar } from "../../lib/data-registrar";

describe("listInvitesForRegistrar", () => {
  beforeEach(() => adminClientMock.mockReset());

  it("seleciona invite_token e o mapeia para inviteToken", async () => {
    const select = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "id-1",
              email: "a@b.com",
              full_name: "Ana",
              target_role: "licenciado",
              status: "sent",
              expires_at: "2026-08-01T00:00:00.000Z",
              invite_token: "tok-xyz",
            },
          ],
          error: null,
        }),
      }),
    });
    adminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    const rows = await listInvitesForRegistrar();

    // O SELECT deve pedir invite_token, mas NÃO colunas financeiras.
    const selectArg = select.mock.calls[0][0] as string;
    expect(selectArg).toContain("invite_token");
    expect(selectArg).not.toContain("license_amount_usd");
    expect(selectArg).not.toContain("payment_link_url");
    expect(rows[0].inviteToken).toBe("tok-xyz");
  });
});
