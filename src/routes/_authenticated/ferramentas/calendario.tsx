import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CalendarioMensal } from "@/components/calendario-mensal";
import { useClientes, FiltroCliente } from "@/components/filtro-cliente";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listConteudos, saveConteudo } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/ferramentas/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — CreatorBox" },
      { name: "description", content: "Calendário mensal de publicações de todos os clientes." },
      { property: "og:title", content: "Calendário — CreatorBox" },
      { property: "og:description", content: "Calendário mensal de publicações de todos os clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarioGeral,
});

function CalendarioGeral() {
  const [filtro, setFiltro] = useState("todos");

  const { data: clientes } = useClientes();
  const { data: conteudos } = useQuery({
    queryKey: ["conteudos", "geral"],
    queryFn: () => listConteudos({ data: {} }),
  });

  const nomeCliente = (id: string) =>
    clientes?.find((c) => c.id === id)?.nome ?? "Cliente";

  const visiveis = (conteudos ?? []).filter(
    (c) => filtro === "todos" || c.cliente_id === filtro,
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendário</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas as publicações planejadas, de todos os clientes.
          </p>
        </div>
        <div className="flex gap-2">
          <FiltroCliente valor={filtro} onChange={setFiltro} />
          <NovoEvento clientes={clientes ?? []} />
        </div>
      </div>

      <CalendarioMensal className="mt-8" conteudos={visiveis} nomeCliente={nomeCliente} />
    </div>
  );
}

type FormEvento = {
  cliente_id: string;
  titulo: string;
  tipo: "reel" | "carrossel" | "story" | "post";
  data_planejada: string;
};

function NovoEvento({ clientes }: { clientes: { id: string; nome: string }[] }) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<FormEvento>({
    cliente_id: "",
    titulo: "",
    tipo: "post",
    data_planejada: "",
  });

  const salvar = useMutation({
    mutationFn: () =>
      saveConteudo({
        data: {
          cliente_id: form.cliente_id,
          titulo: form.titulo,
          tipo: form.tipo,
          status: "planejado",
          categoria: null,
          ideia: null,
          roteiro: null,
          legenda: null,
          cta: null,
          data_planejada: form.data_planejada || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conteudos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setAberto(false);
      setForm({ cliente_id: "", titulo: "", tipo: "post", data_planejada: "" });
      toast.success("Evento adicionado ao calendário.");
    },
    onError: (error: Error) =>
      toast.error("Não foi possível salvar", { description: error.message }),
  });

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9">
          <Plus className="size-4" />
          Novo evento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo evento no calendário</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={form.cliente_id}
              onValueChange={(v) => setForm({ ...form, cliente_id: v })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="evento-titulo">Título</Label>
            <Input
              id="evento-titulo"
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as FormEvento["tipo"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="carrossel">Carrossel</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evento-data">Data</Label>
              <Input
                id="evento-data"
                type="date"
                required
                value={form.data_planejada}
                onChange={(e) => setForm({ ...form, data_planejada: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={salvar.isPending || !form.cliente_id}>
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
