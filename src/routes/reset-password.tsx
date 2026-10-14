import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/external/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha — CreatorBox" },
      { name: "description", content: "Defina uma nova senha para sua conta CreatorBox." },
      { property: "og:title", content: "Nova senha — CreatorBox" },
      { property: "og:description", content: "Defina uma nova senha para sua conta CreatorBox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState<"verificando" | "ok" | "invalido">("verificando");

  useEffect(() => {
    let ativo = true;
    async function preparar() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      try {
        if (hash.get("error") || query.get("error")) throw new Error("link");
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        const tokenHash = query.get("token_hash");
        const code = query.get("code");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        } else if (tokenHash) {
          const type = (query.get("type") ?? "recovery") as "recovery" | "invite" | "magiclink";
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (code) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          }
        }
        let { data } = await supabase.auth.getSession();
        for (let i = 0; !data.session && i < 8; i += 1) {
          await new Promise((r) => setTimeout(r, 250));
          ({ data } = await supabase.auth.getSession());
        }
        if (!data.session) throw new Error("sem sessão");
        window.history.replaceState(null, "", window.location.pathname);
        if (ativo) setEstado("ok");
      } catch {
        if (ativo) setEstado("invalido");
      }
    }
    void preparar();
    return () => {
      ativo = false;
    };
  }, []);

  if (estado !== "ok") {
    return (
      <main className="flex min-h-screen items-center justify-center surface-grid px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-8 text-center shadow-glow">
          {estado === "verificando" ? (
            <p className="text-sm text-muted-foreground">Validando seu link...</p>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">Link inválido ou expirado</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Volte para a tela de login e use "Esqueci minha senha" para receber um novo link.
              </p>
              <Button className="mt-6 w-full" onClick={() => navigate({ to: "/auth" })}>
                Ir para o login
              </Button>
            </>
          )}
        </div>
      </main>
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível salvar a nova senha", { description: error.message });
      return;
    }
    toast.success("Senha atualizada.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center surface-grid px-4">
      <form
        onSubmit={salvar}
        className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-8 shadow-glow"
      >
        <h1 className="text-2xl font-semibold">Defina sua senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha uma senha para acessar o CreatorBox.
        </p>
        <div className="mt-6 space-y-2">
          <Label htmlFor="nova-senha">Nova senha</Label>
          <Input
            id="nova-senha"
            type="password"
            required
            minLength={6}
            value={senha}
            autoComplete="new-password"
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        <Button type="submit" className="mt-6 w-full" disabled={loading}>
          Salvar senha
        </Button>
      </form>
    </main>
  );
}
