import Link from "next/link";
import { UserPlus } from "lucide-react";
import { listPartnersForRegistrar, listInvitesForRegistrar } from "@/lib/data-registrar";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { RegistrarInviteCancelButton } from "./RegistrarInviteCancelButton";
import { PartnerInviteResendActions } from "./PartnerInviteResendActions";
import { partnerOnboardingUrl } from "@/lib/partner-invite-url";

const ROLE_LABEL: Record<string, string> = {
  licenciado: "Licenciado",
  representante: "Representante",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  pending_contract: "Contrato pendente",
  pending_payment: "Pagamento pendente",
  pending_kyc: "KYC pendente",
  suspended: "Suspenso",
  terminated: "Encerrado",
  sent: "Enviado",
};
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: "success",
  suspended: "warning",
  terminated: "destructive",
  pending_contract: "muted",
  pending_payment: "muted",
  pending_kyc: "muted",
  sent: "muted",
};

// View curada do cadastrador · SEM dados financeiros (ver lib/data-registrar).
export async function RegistrarPartnersView() {
  const [partners, invites] = await Promise.all([
    listPartnersForRegistrar(),
    listInvitesForRegistrar(),
  ]);

  return (
    <>
      <PageHeader
        title="Parceiros"
        subtitle={`${partners.length} cadastrados · ${invites.length} convites pendentes`}
        actions={
          <Link href="/partners/invite" className={buttonClasses({ variant: "primary" })}>
            Convidar parceiro
          </Link>
        }
      />

      {invites.length > 0 ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Convites pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <THead>
                <TR>
                  <TH>Nome</TH>
                  <TH>E-mail</TH>
                  <TH>Papel</TH>
                  <TH>Expira</TH>
                  <TH className="text-right">Ações</TH>
                </TR>
              </THead>
              <TBody>
                {invites.map((i) => (
                  <TR key={i.id}>
                    <TD>{i.fullName}</TD>
                    <TD className="text-muted-foreground">{i.email}</TD>
                    <TD>
                      {i.targetRole ? (
                        <Badge variant="muted">{ROLE_LABEL[i.targetRole] ?? i.targetRole}</Badge>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="text-muted-foreground">
                      {new Date(i.expiresAt).toLocaleDateString("pt-BR")}
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <PartnerInviteResendActions
                          invitationId={i.id}
                          inviteUrl={partnerOnboardingUrl(i.inviteToken)}
                          email={i.email}
                        />
                        <RegistrarInviteCancelButton invitationId={i.id} email={i.email} />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {partners.length === 0 ? (
        <EmptyState
          icon={<UserPlus />}
          title="Nenhum parceiro cadastrado ainda"
          description="Convide um parceiro para começar."
          action={
            <Link
              href="/partners/invite"
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              Convidar parceiro
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>E-mail</TH>
              <TH>Papel</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {partners.map((p) => (
              <TR key={p.id}>
                <TD>{p.name}</TD>
                <TD className="text-muted-foreground">{p.email ?? "—"}</TD>
                <TD>
                  {p.role ? (
                    <Badge variant="muted">{ROLE_LABEL[p.role] ?? p.role}</Badge>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "default"}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
