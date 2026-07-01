"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrgAction } from "@/app/_actions/update-org";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function OrgEditDialog({ orgId, initialName }: { orgId: string; initialName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setName(initialName);
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateOrgAction({ orgId, name });
      if (res.ok) {
        setOpen(false);
        toast.success("Organização atualizada");
        router.refresh();
      } else {
        setError(res.message ?? res.error);
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={openDialog}>
        Editar
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Editar organização"
        size="sm"
      >
        <Field label="Nome" htmlFor="org-edit-name" error={error ?? undefined}>
          <Input
            id="org-edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            minLength={2}
            maxLength={200}
            autoFocus
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={save} loading={pending}>
            Salvar
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
