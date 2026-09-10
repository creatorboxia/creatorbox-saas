import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/external/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar no CreatorBox" },
      {
        name: "description",
        content: "Acesse seu espaço no CreatorBox para gerenciar clientes, estratégia e conteúdo.",
      },
      { property: "og:title", content: "Entrar no CreatorBox" },
      {
        property: "og:description",
        content: "Acesse seu espaço no CreatorBox para gerenciar clientes, estratégia e conteúdo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: window.location.origin, data: { nome } },
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível criar a conta", { description: error.message });
      return;
    }
    if (!data.session) {
      setAguardandoConfirmacao(true);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function comGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setLoading(false);
      toast.error("Não foi possível entrar com o Google", { description: error.message });
    }
  }

  async function recuperarSenha() {
    if (!email) {
      toast.error("Escreva seu e-mail primeiro");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("Não foi possível enviar o e-mail", { description: error.message });
      return;
    }
    toast.success("Enviamos um e-mail com o link para criar uma nova senha.");
  }

  if (aguardandoConfirmacao) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">Confirme seu e-mail</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enviamos um link de confirmação para <strong className="text-foreground">{email}</strong>.
          Abra o link para ativar sua conta e entrar.
        </p>
        <Button variant="outline" className="mt-6 w-full" onClick={() => setAguardandoConfirmacao(false)}>
          Voltar
        </Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold">
        Creator<span className="text-primary">Box</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Seu espaço para organizar os clientes que você atende.
      </p>

      <Tabs defaultValue="entrar" className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entrar">Entrar</TabsTrigger>
          <TabsTrigger value="criar">Criar conta</TabsTrigger>
        </TabsList>

        <TabsContent value="entrar">
          <form onSubmit={entrar} className="space-y-4">
            <Campo id="email-login" label="E-mail" type="email" value={email} onChange={setEmail} />
            <Campo
              id="senha-login"
              label="Senha"
              type="password"
              value={senha}
              onChange={setSenha}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
            </Button>
            <button
              type="button"
              onClick={recuperarSenha}
              className="w-full text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Esqueci minha senha
            </button>
          </form>
        </TabsContent>

        <TabsContent value="criar">
          <form onSubmit={cadastrar} className="space-y-4">
            <Campo id="nome" label="Seu nome" type="text" value={nome} onChange={setNome} />
            <Campo id="email-novo" label="E-mail" type="email" value={email} onChange={setEmail} />
            <Campo
              id="senha-nova"
              label="Senha"
              type="password"
              value={senha}
              onChange={setSenha}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Criar conta"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="w-full" onClick={comGoogle} disabled={loading}>
        Continuar com Google
      </Button>

      <Link
        to="/"
        className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Voltar ao início
      </Link>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center surface-grid px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-8 shadow-glow backdrop-blur">
        {children}
      </div>
    </main>
  );
}

function Campo({
  id,
  label,
  type,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required
        autoComplete={type === "password" ? "current-password" : "on"}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
