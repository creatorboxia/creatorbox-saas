import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

const semana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function CalendarioGeral() {
  const hoje = new Date();
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
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

  const primeiroDia = mes.getDay();
  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDia }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  function conteudosDoDia(dia: number) {
    const iso = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}-${String(
      dia,
    ).padStart(2, "0")}`;
    return visiveis.filter((c) => c.data_planejada === iso);
  }

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

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize">
          {mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mês anterior"
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo mês"
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
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
                conteudosDoDia(dia).map((conteudo) => (
                  <p
                    key={conteudo.id}
                    className="truncate rounded bg-primary/20 px-1.5 py-1 text-[11px] text-foreground"
                    title={`${conteudo.titulo} — ${nomeCliente(conteudo.cliente_id)}`}
                  >
                    <span className="text-muted-foreground">{nomeCliente(conteudo.cliente_id)} · </span>
                    {conteudo.titulo}
                  </p>
                ))}
            </div>
          </div>
        ))}
      </div>
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
