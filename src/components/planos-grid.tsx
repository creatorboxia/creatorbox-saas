import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PLANOS, formatarPreco } from "@/lib/planos";
import { criarCheckoutAssinatura } from "@/lib/stripe.functions";
import { cn } from "@/lib/utils";

export function PlanosGrid() {
  const [carregando, setCarregando] = useState<string | null>(null);

  async function assinar(planoId: string) {
    setCarregando(planoId);
    try {
      const { url } = await criarCheckoutAssinatura({
        data: { planoId, origem: window.location.origin },
      });
      window.location.href = url;
    } catch (e) {
      setCarregando(null);
      toast.error("Não foi possível abrir o pagamento", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANOS.map((p) => (
          <article
            key={p.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card/70 p-7 transition-colors",
              p.destaque ? "border-primary/60 shadow-glow" : "border-border hover:border-primary/40",
            )}
          >
            {p.destaque && (
              <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Mais escolhido
              </span>
            )}
            <h3 className="text-lg font-semibold">{p.nome}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.descricao}</p>
            <p className="mt-6 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold">
                {formatarPreco(p.precoCentavos)}
              </span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {p.recursos.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {r}
                </li>
              ))}
            </ul>
            <Button
              className="mt-8 w-full"
              variant={p.destaque ? "default" : "outline"}
              disabled={carregando !== null}
              onClick={() => assinar(p.id)}
            >
              {carregando === p.id ? <Loader2 className="size-4 animate-spin" /> : "Assinar"}
            </Button>
          </article>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Os créditos renovam todo mês e não acumulam: a cada renovação o saldo volta ao total do
        plano. Cancele quando quiser.
      </p>
    </div>
  );
}
