import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  ClienteForm,
  toClienteInput,
  toFormValues,
  type ClienteFormValues,
} from "@/components/cliente-form";
import { Button } from "@/components/ui/button";
import { deleteCliente, getCliente, updateCliente } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/clientes/$clienteId/informacoes")({
  head: () => ({
    meta: [
      { title: "Informações do cliente — CreatorBox" },
      { name: "description", content: "Edite briefing, público e estratégia do cliente." },
      { property: "og:title", content: "Informações do cliente — CreatorBox" },
      { property: "og:description", content: "Edite briefing, público e estratégia do cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Informacoes,
});

function Informacoes() {
  const { clienteId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: () => getCliente({ data: { id: clienteId } }),
  });

  const salvar = useMutation({
    mutationFn: (values: ClienteFormValues) =>
      updateCliente({ data: { ...toClienteInput(values), id: clienteId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Informações atualizadas.");
    },
    onError: (error: Error) =>
      toast.error("Não foi possível salvar", { description: error.message }),
  });

  const remover = useMutation({
    mutationFn: () => deleteCliente({ data: { id: clienteId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Cliente excluído.");
      navigate({ to: "/dashboard" });
    },
    onError: (error: Error) =>
      toast.error("Não foi possível excluir", { description: error.message }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-8">
      <ClienteForm
        initial={toFormValues(cliente)}
        submitLabel="Salvar alterações"
        saving={salvar.isPending}
        onSubmit={(values) => salvar.mutate(values)}
      />

      <div className="flex items-center justify-between rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <div>
          <p className="text-sm font-medium">Excluir cliente</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Isso apaga também os conteúdos ligados a esse cliente.
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => {
            if (window.confirm("Excluir esse cliente e todos os conteúdos dele?")) remover.mutate();
          }}
          disabled={remover.isPending}
        >
          Excluir
        </Button>
      </div>
    </div>
  );
}
