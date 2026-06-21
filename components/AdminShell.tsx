import { Sidebar } from "./Sidebar";
import { getCallerClaims } from "@/lib/auth";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const claims = await getCallerClaims();
  const isRegistrar = claims?.tier === "registrar" && claims?.super_admin !== true;
  return (
    <div className="flex min-h-screen">
      <Sidebar isRegistrar={isRegistrar} />
      <main className="flex-1 min-w-0 p-6 sm:p-10 max-w-6xl">{children}</main>
    </div>
  );
}
