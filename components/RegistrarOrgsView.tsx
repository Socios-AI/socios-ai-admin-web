import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { RegistrarOrgsTable } from "@/components/RegistrarOrgsTable";
import { buttonClasses } from "@/components/ui/button";
import { listOrgsForRegistrar } from "@/lib/data-registrar";

// View curada do cadastrador · orgs sem nenhum dado de assinatura/financeiro,
// agrupadas por cliente (mesmo responsável em vários nichos vira uma linha).
export async function RegistrarOrgsView() {
  const clients = await listOrgsForRegistrar();
  const totalOrgs = clients.reduce((n, c) => n + c.orgs.length, 0);

  return (
    <>
      <PageHeader
        title="Organizações"
        subtitle={`${totalOrgs} no total`}
        actions={
          <Link href="/orgs/new" className={buttonClasses({ variant: "primary" })}>
            Novo cliente
          </Link>
        }
      />

      <RegistrarOrgsTable clients={clients} />
    </>
  );
}
