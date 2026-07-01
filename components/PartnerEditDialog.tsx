"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PartnerEditForm } from "@/components/PartnerEditForm";

type RawProfile = Record<string, unknown> | null;

export function PartnerEditDialog({
  partnerId,
  initialFullName,
  initialEmail,
  initialProfile,
}: {
  partnerId: string;
  initialFullName: string;
  initialEmail: string;
  initialProfile: RawProfile;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
        onClick={() => setOpen(true)}
      >
        Editar cadastro
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Editar cadastro"
        size="lg"
        className="max-w-2xl"
      >
        <PartnerEditForm
          partnerId={partnerId}
          initialFullName={initialFullName}
          initialEmail={initialEmail}
          initialProfile={initialProfile}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
          onCancel={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
