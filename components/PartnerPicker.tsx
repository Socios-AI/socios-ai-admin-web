"use client";

import { useRef, useState } from "react";
import { searchPartnersAction, type PartnerSearchRow } from "@/app/_actions/search-partners";

const ROLE_LABEL: Record<string, string> = {
  licenciado: "Licenciado",
  representante: "Representante",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};

type Props = {
  value: PartnerSearchRow | null;
  onChange: (partner: PartnerSearchRow | null) => void;
  label?: string;
};

export function PartnerPicker({ value, onChange, label = "Indicado por (opcional)" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PartnerSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);

  async function runSearch(q: string) {
    const current = ++seq.current;
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await searchPartnersAction(q);
    if (current !== seq.current) return; // resposta obsoleta, ignora
    setSearching(false);
    setResults(res.ok ? res.partners : []);
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor="partnerQuery" className="text-sm font-medium">{label}</label>
      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-input bg-muted px-3 py-2">
          <span className="text-sm">
            {value.label}
            <span className="ml-2 text-xs text-muted-foreground">
              {ROLE_LABEL[value.role] ?? value.role}
            </span>
          </span>
          <button
            type="button"
            className="text-xs underline"
            onClick={() => { onChange(null); setQuery(""); setResults([]); }}
          >
            trocar
          </button>
        </div>
      ) : (
        <>
          <input
            id="partnerQuery"
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Buscar por nome ou email do parceiro"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          {searching && <p className="text-xs text-muted-foreground">Buscando...</p>}
          {results.length > 0 && (
            <ul className="max-h-48 overflow-auto rounded-lg border border-input">
              {results.map((p) => (
                <li key={p.partnerId}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => { onChange(p); setResults([]); }}
                  >
                    <span>{p.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {ROLE_LABEL[p.role] ?? p.role}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum parceiro ativo encontrado.</p>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Marque se algum parceiro trouxe esse usuário (gera comissão quando ele pagar).
      </p>
    </div>
  );
}
