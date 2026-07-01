"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireSuperAdminAAL2, VIEW_AS_COOKIE } from "@/lib/auth";

// Liga/desliga o modo "ver como Cadastrador" pra um super_admin. O cookie é
// host-only (só admin.sociosai.com) e só muda o que é renderizado; nenhum poder
// extra é concedido (super_admin já tem acesso total). Gate em requireSuperAdminAAL2
// pra que só um super_admin com AAL2 consiga setar.

export async function enableRegistrarPreview(): Promise<void> {
  const gate = await requireSuperAdminAAL2();
  if (!gate) return;
  const cookieStore = await cookies();
  cookieStore.set(VIEW_AS_COOKIE, "registrar", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
}

export async function disableRegistrarPreview(): Promise<void> {
  const gate = await requireSuperAdminAAL2();
  if (!gate) return;
  const cookieStore = await cookies();
  cookieStore.delete(VIEW_AS_COOKIE);
  revalidatePath("/", "layout");
}
