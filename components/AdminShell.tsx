import { AppShell } from "./AppShell";
import { getEffectiveRegistrar } from "@/lib/auth";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const { isRegistrar, isPreview, isSuper } = await getEffectiveRegistrar();
  return (
    <AppShell isRegistrar={isRegistrar} isSuper={isSuper} isPreview={isPreview}>
      {children}
    </AppShell>
  );
}
