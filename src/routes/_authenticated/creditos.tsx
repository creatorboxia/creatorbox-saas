import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Coins, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  criarCheckout,
  getPerfil,
  listProdutosCreditos,
  type ProdutoCredito,
} from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/creditos")({
  head: () => ({
    meta: [
      { title: "Comprar créditos — CreatorBox" },
      {
        name: "description",
        content: "Escolha um pacote de créditos e continue usando o assistente do CreatorBox.",
      },
      { property: "og:title", content: "Comprar créditos — CreatorBox" },
      {
        property: "og:description",
        content: "Escolha um pacote de créditos e continue usando o assistente do CreatorBox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Creditos,
});

function formatarPreco(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function Creditos() {
  const [comprandoId, setComprandoId] = useState<string | null>(null);

  const { data: perfil } = useQuery({ queryKey: ["perfil"], queryFn: () => getPerfil() });
  const { data: produtos, isLoading } = useQuery({
    queryKey: ["produtos-creditos"],
    queryFn: () => listProdutosCreditos(),
  });

  const comprar = useMutation({
    mutationFn: (produtoId: string) => criarCheckout({ data: { produtoId } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (erro: Error) => {
      setComprandoId(null);
      toast.error("Não foi possível abrir o pagamento", { description: erro.message });
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Comprar créditos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Os créditos são usados nas conversas com o assistente de conteúdo.
        </p>
      </header>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/25">
          <Coins className="size-4 text-primary" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Saldo atual</p>
          <p className="font-display text-xl font-semibold">
            {perfil?.saldo_creditos ?? 0} créditos
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : (produtos ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nenhum pacote disponível no momento.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(produtos ?? []).map((produto: ProdutoCredito) => (
            <article
              key={produto.id}
              className="flex flex-col rounded-2xl border border-border bg-card/60 p-6"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h2 className="text-base font-semibold">{produto.nome}</h2>
              </div>
              <p className="mt-3 font-display text-3xl font-semibold">
                {produto.creditos.toLocaleString("pt-BR")}
                <span className="ml-1 text-sm font-normal text-muted-foreground">créditos</span>
              </p>
              {produto.descricao && (
                <p className="mt-2 text-sm text-muted-foreground">{produto.descricao}</p>
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                {formatarPreco(Number(produto.preco))}
              </p>
              <Button
                className="mt-5"
                disabled={comprar.isPending}
                onClick={() => {
                  setComprandoId(produto.id);
                  comprar.mutate(produto.id);
                }}
              >
                {comprar.isPending && comprandoId === produto.id && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Comprar
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
