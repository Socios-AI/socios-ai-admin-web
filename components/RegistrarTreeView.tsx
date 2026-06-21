import { listTreeForRegistrar } from "@/lib/data-registrar";

const ROLE_LABEL: Record<string, string> = {
  licenciado: "Licenciado",
  representante: "Representante",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};

// Árvore curada do cadastrador · hierarquia + papel, SEM taxas/comissões.
export async function RegistrarTreeView() {
  const nodes = await listTreeForRegistrar();
  const licenciados = nodes.filter((n) => n.role === "licenciado").length;

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl">Árvore da rede</h1>
        <p className="text-muted-foreground text-sm">
          {nodes.length} parceiros · {licenciados} licenciados · raiz = Sócios AI
        </p>
      </header>
      {nodes.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum parceiro na rede ainda.</p>
      ) : (
        <ul className="space-y-1">
          {nodes.map((n) => (
            <li
              key={n.id}
              className="flex items-center gap-2 text-sm"
              style={{ paddingLeft: `${n.depth * 1.5}rem` }}
            >
              <span className="text-muted-foreground">{n.depth > 0 ? "└" : "•"}</span>
              <span className="font-medium">{n.name}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {n.role ? ROLE_LABEL[n.role] ?? n.role : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
