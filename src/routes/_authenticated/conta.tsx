import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Loader2, Sparkles, Upload, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/external/client";
import { getPerfil, updatePerfil } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Minha conta — CreatorBox" },
      {
        name: "description",
        content: "Ajuste seu perfil, veja seus créditos e o plano da sua conta no CreatorBox.",
      },
      { property: "og:title", content: "Minha conta — CreatorBox" },
      {
        property: "og:description",
        content: "Ajuste seu perfil, veja seus créditos e o plano da sua conta no CreatorBox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Conta,
});

function Secao({
  icon: Icon,
  titulo,
  descricao,
  children,
}: {
  icon: typeof User;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/25">
          <Icon className="size-4 text-primary" />
        </span>
        <div>
          <h2 className="text-base font-semibold">{titulo}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Conta() {
  const queryClient = useQueryClient();
  const inputArquivo = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { data: perfil, isLoading } = useQuery({
    queryKey: ["perfil"],
    queryFn: () => getPerfil(),
  });

  useEffect(() => {
    if (perfil) setNome(perfil.nome ?? "");
  }, [perfil]);

  const salvar = useMutation({
    mutationFn: (dados: { nome?: string | null; avatar_url?: string | null }) =>
      updatePerfil({ data: dados }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfil"] });
      toast.success("Perfil atualizado");
    },
    onError: (erro: Error) =>
      toast.error("Não foi possível salvar", { description: erro.message }),
  });

  async function enviarFoto(arquivo: File) {
    setEnviando(true);
    try {
      const { data: sessao } = await supabase.auth.getUser();
      const userId = sessao.user?.id;
      if (!userId) throw new Error("Sessão expirada. Entre novamente.");

      const extensao = arquivo.name.split(".").pop()?.toLowerCase() || "jpg";
      const caminho = `${userId}/avatar-${Date.now()}.${extensao}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });
      if (error) throw new Error(error.message);

      const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
      await salvar.mutateAsync({ avatar_url: data.publicUrl });
    } catch (erro) {
      toast.error("Não foi possível enviar a foto", {
        description: erro instanceof Error ? erro.message : undefined,
      });
    } finally {
      setEnviando(false);
    }
  }

  const iniciais = (perfil?.nome ?? perfil?.email ?? "?").trim().slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Minha conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus dados, créditos e plano de assinatura.
        </p>
      </header>

      {isLoading ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <Secao icon={User} titulo="Perfil" descricao="Como você aparece dentro do CreatorBox.">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar className="size-16">
                {perfil?.avatar_url ? <AvatarImage src={perfil.avatar_url} alt="" /> : null}
                <AvatarFallback>{iniciais}</AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={inputArquivo}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    if (arquivo) void enviarFoto(arquivo);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={enviando}
                  onClick={() => inputArquivo.current?.click()}
                >
                  {enviando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Trocar foto
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">JPG ou PNG, até 2 MB.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" value={perfil?.email ?? ""} readOnly disabled />
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={() => salvar.mutate({ nome })}
                disabled={salvar.isPending || nome.trim() === (perfil?.nome ?? "")}
              >
                {salvar.isPending && <Loader2 className="size-4 animate-spin" />}
                Salvar alterações
              </Button>
            </div>
          </Secao>

          <Secao
            icon={Sparkles}
            titulo="Créditos"
            descricao="Saldo para usar o assistente de ideias."
          >
            <div className="flex items-center gap-3">
              <span className="font-display text-3xl font-semibold text-muted-foreground">—</span>
              <Badge variant="secondary">Em breve</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              O sistema de créditos está a caminho. Por enquanto o assistente segue liberado.
            </p>
          </Secao>

          <Secao icon={CreditCard} titulo="Assinatura" descricao="Seu plano atual no CreatorBox.">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="capitalize">{perfil?.plano ?? "free"}</Badge>
              <span className="text-sm text-muted-foreground capitalize">
                Status: {perfil?.status_assinatura ?? "ativo"}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Planos pagos e upgrade de conta chegam na próxima fase.
            </p>
          </Secao>
        </div>
      )}
    </div>
  );
}
