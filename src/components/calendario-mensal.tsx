import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Conteudo } from "@/lib/creatorbox.functions";

const semana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Grade mensal compartilhada pelo calendário geral e pelo calendário do cliente.
 * Recebe os conteúdos já filtrados; `nomeCliente` (opcional) exibe o cliente em cada item.
 */
export function CalendarioMensal({
  conteudos,
  nomeCliente,
  className,
}: {
  conteudos: Conteudo[];
  nomeCliente?: (clienteId: string) => string;
  className?: string;
}) {
  const hoje = new Date();
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));

  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array.from({ length: mes.getDay() }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  function conteudosDoDia(dia: number) {
    const iso = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}-${String(
      dia,
    ).padStart(2, "0")}`;
    return conteudos.filter((c) => c.data_planejada === iso);
  }

  const mudarMes = (delta: number) =>
    setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize">
          {mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mês anterior"
            onClick={() => mudarMes(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo mês"
            onClick={() => mudarMes(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {semana.map((dia) => (
          <div key={dia} className="py-2">
            {dia}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulas.map((dia, i) => (
          <div
            key={i}
            className={`min-h-24 rounded-lg border p-2 text-left ${
              dia ? "border-border bg-card/40" : "border-transparent"
            }`}
          >
            {dia && <p className="text-xs text-muted-foreground">{dia}</p>}
            <div className="mt-1 space-y-1">
              {dia &&
                conteudosDoDia(dia).map((conteudo) => {
                  const cliente = nomeCliente?.(conteudo.cliente_id);
                  return (
                    <p
                      key={conteudo.id}
                      className="truncate rounded bg-primary/20 px-1.5 py-1 text-[11px] text-foreground"
                      title={cliente ? `${conteudo.titulo} — ${cliente}` : conteudo.titulo}
                    >
                      {cliente && <span className="text-muted-foreground">{cliente} · </span>}
                      {conteudo.titulo}
                    </p>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
