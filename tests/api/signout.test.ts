import { describe, it, expect, vi } from "vitest";

// A lógica de limpar o cookie vive em @socios-ai/auth/next (testada lá).
// Aqui garantimos só que o route delega com o `from` correto.
const { mockSignOut } = vi.hoisted(() => ({ mockSignOut: vi.fn() }));
vi.mock("@socios-ai/auth/next", () => ({ signOutResponse: mockSignOut }));

import { POST } from "@/app/signout/route";

describe("POST /signout", () => {
  it("delega pro signOutResponse com from=admin", async () => {
    mockSignOut.mockResolvedValue(new Response(null, { status: 303 }));
    await POST();
    expect(mockSignOut).toHaveBeenCalledWith({ from: "https://admin.sociosai.com/" });
  });
});
