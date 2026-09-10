import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
        <h1 className="text-2xl font-semibold">Criar nova senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha uma senha nova para voltar a acessar sua conta.
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
