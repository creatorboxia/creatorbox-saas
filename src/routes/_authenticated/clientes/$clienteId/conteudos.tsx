import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConteudoDialog, statusLabel, type ConteudoForm } from "@/components/conteudo-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteConteudo, listConteudos, type Conteudo } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/clientes/$clienteId/conteudos")({
  head: () => ({
    meta: [
      { title: "Conteúdos do cliente — CreatorBox" },
      { name: "description", content: "Banco de ideias, roteiros e legendas do cliente." },
      { property: "og:title", content: "Conteúdos do cliente — CreatorBox" },
      { property: "og:description", content: "Banco de ideias, roteiros e legendas do cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Conteudos,
});

function Conteudos() {
  const { clienteId } = Route.useParams();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Conteudo | null>(null);

  const { data: conteudos } = useQuery({
    queryKey: ["conteudos", clienteId],
    queryFn: () => listConteudos({ data: { clienteId } }),
  });

  const remover = useMutation({
    mutationFn: (id: string) => deleteConteudo({ data: { id } }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conteudos"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success("Conteúdo removido.");
    },
    onError: (error: Error) =>
      toast.error("Não foi possível remover", { description: error.message }),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Guarde ideias, roteiros e legendas prontas para publicar.
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setAberto(true);
          }}
        >
          <Plus className="size-4" />
          Novo conteúdo
        </Button>
      </div>

      <ConteudoDialog
        open={aberto}
        onOpenChange={(o) => {
          setAberto(o);
          if (!o) setEditando(null);
        }}
        conteudo={editando}
        clienteFixo={clienteId}
      />

      <div className="mt-6 space-y-2">
        {(conteudos ?? []).map((conteudo) => (
          <div
            key={conteudo.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-4 py-3"
          >
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                setEditando(conteudo);
                setAberto(true);
              }}
            >
              <p className="truncate text-sm font-medium">{conteudo.titulo}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {conteudo.tipo}
                {conteudo.data_planejada
                  ? ` · ${new Date(`${conteudo.data_planejada}T00:00:00`).toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
            </button>
            <Badge variant="secondary">
              {statusLabel[conteudo.status as ConteudoForm["status"]]}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remover conteúdo"
              disabled={remover.isPending}
              onClick={() => {
                if (window.confirm(`Excluir "${conteudo.titulo}"? Essa ação não pode ser desfeita.`))
                  remover.mutate(conteudo.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {conteudos?.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum conteúdo cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
