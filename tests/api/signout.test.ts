import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAll } = vi.hoisted(() => ({ mockGetAll: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: () => ({ getAll: mockGetAll }) }));

import { POST } from "@/app/signout/route";

describe("POST /signout", () => {
  beforeEach(() => {
    mockGetAll.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xyzref.supabase.co";
  });

  it("redireciona pro login do identity (303)", async () => {
    mockGetAll.mockReturnValue([]);
    const res = await POST();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("id.sociosai.com/login");
  });

  it("apaga o cookie de sessão (base + chunks presentes) NO response, com domínio .sociosai.com", async () => {
    mockGetAll.mockReturnValue([
      { name: "sb-xyzref-auth-token.0", value: "a" },
      { name: "sb-xyzref-auth-token.1", value: "b" },
      { name: "unrelated", value: "c" },
    ]);
    const res = await POST();

    for (const name of ["sb-xyzref-auth-token", "sb-xyzref-auth-token.0", "sb-xyzref-auth-token.1"]) {
      const ck = res.cookies.get(name);
      expect(ck, `cookie ${name} deve ser apagado no response`).toBeTruthy();
      expect(ck?.value).toBe("");
      expect(ck?.maxAge).toBe(0);
      expect(ck?.domain).toBe(".sociosai.com");
    }
    // não mexe em cookie alheio
    expect(res.cookies.get("unrelated")).toBeUndefined();
  });

  it("limpa chunks além de 5 (range não pode ser fixo em 5)", async () => {
    mockGetAll.mockReturnValue([{ name: "sb-xyzref-auth-token.7", value: "x" }]);
    const res = await POST();
    const ck = res.cookies.get("sb-xyzref-auth-token.7");
    expect(ck?.value).toBe("");
    expect(ck?.maxAge).toBe(0);
  });
});
