import { Sidebar } from "./Sidebar";
import { getEffectiveRegistrar } from "@/lib/auth";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const { isRegistrar, isPreview, isSuper } = await getEffectiveRegistrar();
  return (
    <div className="flex min-h-screen">
      <Sidebar isRegistrar={isRegistrar} isSuper={isSuper} isPreview={isPreview} />
      <main className="flex-1 min-w-0 p-6 sm:p-10 max-w-6xl">
        {isPreview ? (
          <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
            Você está vendo o painel <strong>como Cadastrador</strong>. Use o botão
            no menu lateral para voltar à visão completa.
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
