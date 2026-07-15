"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { setOnboardingMilestoneAction } from "@/app/_actions/set-onboarding-milestone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui/cn";

type ManualKey = "welcome_kit" | "whatsapp_group" | "first_meeting";

export type OnboardingChecklistProps = {
  partnerId: string;
  contractSignedAt: string | null;
  licensePaidAt: string | null;
  welcomeKitShippedAt: string | null;
  whatsappGroupJoinedAt: string | null;
  firstMeetingAt: string | null;
  firstSaleAt: string | null;
};

function fmt(at: string | null): string {
  if (!at) return "";
  return new Date(at).toLocaleDateString("pt-BR");
}

type Item = {
  label: string;
  at: string | null;
  manual: ManualKey | null;
  // Dica exibida quando pendente (ex.: sistema desligado).
  pendingHint?: string;
};

function ManualRow({
  partnerId,
  item,
}: {
  partnerId: string;
  item: Item & { manual: ManualKey };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const done = item.at !== null;

  function toggle() {
    startTransition(async () => {
      const r = await setOnboardingMilestoneAction({
        partnerId,
        milestone: item.manual,
        done: !done,
      });
      if (!r.ok) {
        toast.error(r.message ?? "Não foi possível atualizar o marco.");
        return;
      }
      toast.success(done ? "Marco desmarcado." : "Marco concluído.");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={done}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50",
        done && "border-primary/40 bg-primary/5",
      )}
    >
      {done ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <span className="flex-1 font-medium">{item.label}</span>
      {done ? (
        <span className="font-mono text-xs text-muted-foreground">{fmt(item.at)}</span>
      ) : (
        <span className="text-xs text-muted-foreground">marcar</span>
      )}
    </button>
  );
}

function AutoRow({ item }: { item: Item }) {
  const done = item.at !== null;
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-border px-3 py-2.5 text-sm">
      {done ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <Lock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <span className="flex-1 font-medium">{item.label}</span>
      {done ? (
        <span className="font-mono text-xs text-muted-foreground">{fmt(item.at)}</span>
      ) : (
        <span className="text-xs text-muted-foreground">{item.pendingHint ?? "pendente"}</span>
      )}
    </div>
  );
}

export function OnboardingChecklist(props: OnboardingChecklistProps) {
  const items: Item[] = [
    {
      label: "Contrato assinado",
      at: props.contractSignedAt,
      manual: null,
      pendingHint: "via Dropbox Sign",
    },
    {
      label: "Taxa de licença paga",
      at: props.licensePaidAt,
      manual: null,
      pendingHint: "cobrança pendente",
    },
    { label: "Welcome kit enviado", at: props.welcomeKitShippedAt, manual: "welcome_kit" },
    { label: "Grupo WhatsApp", at: props.whatsappGroupJoinedAt, manual: "whatsapp_group" },
    { label: "1ª reunião", at: props.firstMeetingAt, manual: "first_meeting" },
    {
      label: "1ª venda",
      at: props.firstSaleAt,
      manual: null,
      pendingHint: "aguardando primeira venda",
    },
  ];

  const doneCount = items.filter((i) => i.at !== null).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Onboarding</CardTitle>
        <Badge variant={doneCount === items.length ? "success" : "muted"}>
          {doneCount}/{items.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) =>
          item.manual ? (
            <ManualRow
              key={item.label}
              partnerId={props.partnerId}
              item={item as Item & { manual: ManualKey }}
            />
          ) : (
            <AutoRow key={item.label} item={item} />
          ),
        )}
        <p className="pt-1 text-xs text-muted-foreground">
          Kit, grupo e reunião são marcados manualmente. Contrato, taxa e 1ª venda
          são preenchidos automaticamente pelos sistemas.
        </p>
      </CardContent>
    </Card>
  );
}
