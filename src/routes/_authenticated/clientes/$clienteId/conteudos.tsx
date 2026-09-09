import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  deleteConteudo,
  listConteudos,
  saveConteudo,
  type Conteudo,
} from "@/lib/creatorbox.functions";

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

type Form = {
  tipo: "reel" | "carrossel" | "story" | "post";
  status: "ideia" | "planejado" | "produzido" | "publicado";
  titulo: string;
  categoria: string;
  ideia: string;
  roteiro: string;
  legenda: string;
  cta: string;
  data_planejada: string;
};

const vazio: Form = {
  tipo: "reel",
  status: "ideia",
  titulo: "",
  categoria: "",
  ideia: "",
  roteiro: "",
  legenda: "",
  cta: "",
  data_planejada: "",
};

const statusLabel: Record<Form["status"], string> = {
  ideia: "Ideia",
  planejado: "Planejado",
  produzido: "Produzido",
  publicado: "Publicado",
};

function Conteudos() {
  const { clienteId } = Route.useParams();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(vazio);

  const { data: conteudos } = useQuery({
    queryKey: ["conteudos", clienteId],
    queryFn: () => listConteudos({ data: { clienteId } }),
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["conteudos", clienteId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const salvar = useMutation({
    mutationFn: () =>
      saveConteudo({
        data: {
          ...(editando ? { id: editando } : {}),
          cliente_id: clienteId,
          tipo: form.tipo,
          status: form.status,
          titulo: form.titulo,
          categoria: form.categoria || null,
          ideia: form.ideia || null,
          roteiro: form.roteiro || null,
          legenda: form.legenda || null,
          cta: form.cta || null,
          data_planejada: form.data_planejada || null,
        },
      }),
    onSuccess: () => {
      invalidar();
      setAberto(false);
      setEditando(null);
      setForm(vazio);
      toast.success("Conteúdo salvo.");
    },
    onError: (error: Error) =>
      toast.error("Não foi possível salvar", { description: error.message }),
  });

  const remover = useMutation({
    mutationFn: (id: string) => deleteConteudo({ data: { id } }),
    onSuccess: () => {
      invalidar();
      toast.success("Conteúdo removido.");
    },
    onError: (error: Error) =>
      toast.error("Não foi possível remover", { description: error.message }),
  });

  function abrirEdicao(conteudo: Conteudo) {
    setEditando(conteudo.id);
    setForm({
      tipo: conteudo.tipo as Form["tipo"],
      status: conteudo.status as Form["status"],
      titulo: conteudo.titulo,
      categoria: conteudo.categoria ?? "",
      ideia: conteudo.ideia ?? "",
      roteiro: conteudo.roteiro ?? "",
      legenda: conteudo.legenda ?? "",
      cta: conteudo.cta ?? "",
      data_planejada: conteudo.data_planejada ?? "",
    });
    setAberto(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Guarde ideias, roteiros e legendas prontas para publicar.
        </p>
        <Dialog
          open={aberto}
          onOpenChange={(open) => {
            setAberto(open);
            if (!open) {
              setEditando(null);
              setForm(vazio);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              Novo conteúdo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editando ? "Editar conteúdo" : "Novo conteúdo"}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                salvar.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    required
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setForm({ ...form, tipo: v as Form["tipo"] })}
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
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as Form["status"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ideia">Ideia</SelectItem>
                      <SelectItem value="planejado">Planejado</SelectItem>
                      <SelectItem value="produzido">Produzido</SelectItem>
                      <SelectItem value="publicado">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    value={form.categoria}
                    placeholder="Educativo, vendas, bastidores..."
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data">Data planejada</Label>
                  <Input
                    id="data"
                    type="date"
                    value={form.data_planejada}
                    onChange={(e) => setForm({ ...form, data_planejada: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ideia">Ideia</Label>
                  <Textarea
                    id="ideia"
                    rows={2}
                    value={form.ideia}
                    onChange={(e) => setForm({ ...form, ideia: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="roteiro">Roteiro</Label>
                  <Textarea
                    id="roteiro"
                    rows={4}
                    value={form.roteiro}
                    onChange={(e) => setForm({ ...form, roteiro: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="legenda">Legenda</Label>
                  <Textarea
                    id="legenda"
                    rows={3}
                    value={form.legenda}
                    onChange={(e) => setForm({ ...form, legenda: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cta">Chamada para ação</Label>
                  <Input
                    id="cta"
                    value={form.cta}
                    onChange={(e) => setForm({ ...form, cta: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={salvar.isPending}>
                  Salvar conteúdo
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 space-y-2">
        {(conteudos ?? []).map((conteudo) => (
          <div
            key={conteudo.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-4 py-3"
          >
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => abrirEdicao(conteudo)}
            >
              <p className="truncate text-sm font-medium">{conteudo.titulo}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {conteudo.tipo}
                {conteudo.data_planejada
                  ? ` · ${new Date(`${conteudo.data_planejada}T00:00:00`).toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
            </button>
            <Badge variant="secondary">{statusLabel[conteudo.status as Form["status"]]}</Badge>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remover conteúdo"
              onClick={() => remover.mutate(conteudo.id)}
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
