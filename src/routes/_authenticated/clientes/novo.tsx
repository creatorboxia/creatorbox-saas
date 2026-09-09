import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { ClienteForm, toClienteInput, toFormValues } from "@/components/cliente-form";
import { createCliente } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/clientes/novo")({
  head: () => ({
    meta: [
      { title: "Novo cliente — CreatorBox" },
      {
        name: "description",
        content: "Cadastre um novo cliente com briefing, público e estratégia no CreatorBox.",
      },
      { property: "og:title", content: "Novo cliente — CreatorBox" },
      {
        property: "og:description",
        content: "Cadastre um novo cliente com briefing, público e estratégia no CreatorBox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NovoCliente,
});

function NovoCliente() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const salvar = useMutation({
    mutationFn: (values: ReturnType<typeof toFormValues>) =>
      createCliente({ data: toClienteInput(values) }),
    onSuccess: async (cliente) => {
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Cliente cadastrado.");
      const id = (cliente as { id?: string } | null)?.id;
      if (id) navigate({ to: "/clientes/$clienteId", params: { clienteId: id } });
      else navigate({ to: "/dashboard" });
    },
    onError: (error: Error) =>
      toast.error("Não foi possível salvar o cliente", { description: error.message }),
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Novo cliente</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Preencha o que já souber. É possível completar depois em Informações do cliente.
      </p>
      <div className="mt-8">
        <ClienteForm
          initial={toFormValues(null)}
          submitLabel="Cadastrar cliente"
          saving={salvar.isPending}
          onSubmit={(values) => salvar.mutate(values)}
        />
      </div>
    </div>
  );
}
