import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPerfil } from "@/lib/creatorbox.functions";
import { getPlano } from "@/lib/planos";

export const Route = createFileRoute("/_authenticated/creditos")({
  head: () => ({
    meta: [
      { title: "Meus créditos — CreatorBox" },
      { name: "description", content: "Veja seu saldo de créditos e o seu plano no CreatorBox." },
      { property: "og:title", content: "Meus créditos — CreatorBox" },
      { property: "og:description", content: "Saldo de créditos e plano do CreatorBox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Creditos,
});

function Creditos() {
  const { data: perfil } = useQuery({ queryKey: ["perfil"], queryFn: () => getPerfil() });
  const plano = getPlano(perfil?.plano);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Meus créditos</h1>
      <div className="mt-6 rounded-2xl border border-border bg-card/70 p-7">
        <div className="flex items-center gap-3">
          <Coins className="size-5 text-primary" />
          <span className="text-3xl font-semibold">{perfil?.saldo_creditos ?? 0}</span>
          <span className="text-muted-foreground">créditos disponíveis</span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {plano
            ? `Plano ${plano.nome}: ${plano.creditos} créditos por mês. Os créditos não acumulam — a cada renovação o saldo volta para ${plano.creditos}.`
            : "Você ainda não tem um plano ativo."}
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/planos">Ver planos</Link>
        </Button>
      </div>
    </div>
  );
}
