import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { listOrgsForRegistrar } from "@/lib/data-registrar";

// View curada do cadastrador · orgs sem nenhum dado de assinatura/financeiro.
export async function RegistrarOrgsView() {
  const orgs = await listOrgsForRegistrar();

  return (
    <>
      <PageHeader
        title="Organizações"
        subtitle={`${orgs.length} no total`}
        actions={
          <Link href="/orgs/new" className={buttonClasses({ variant: "primary" })}>
            Novo cliente
          </Link>
        }
      />

      {orgs.length === 0 ? (
        <EmptyState
          title="Nenhuma organização cadastrada ainda"
          description="Cadastre o primeiro cliente para começar."
          action={
            <Link href="/orgs/new" className={buttonClasses({ variant: "primary", size: "sm" })}>
              Novo cliente
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Slug</TH>
              <TH>Nicho</TH>
              <TH>Criado</TH>
            </TR>
          </THead>
          <TBody>
            {orgs.map((o) => (
              <TR key={o.id}>
                <TD className="font-medium">
                  <Link href={`/orgs/${o.id}`} className="text-primary hover:underline">
                    {o.name}
                  </Link>
                </TD>
                <TD className="text-muted-foreground">{o.slug}</TD>
                <TD className="text-muted-foreground">{o.niche ?? "(sem nicho)"}</TD>
                <TD className="text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
