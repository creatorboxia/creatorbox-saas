import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, MessagesSquare, Sparkles, Target, Users } from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CreatorBox — o cérebro criativo do seu portfólio de clientes" },
      {
        name: "description",
        content:
          "CreatorBox reúne o briefing, a estratégia, o calendário e as ideias de conteúdo de cada cliente que você atende como social media.",
      },
      { property: "og:title", content: "CreatorBox — o cérebro criativo do seu portfólio" },
      {
        property: "og:description",
        content:
          "Briefing, estratégia, calendário e ideias de conteúdo por cliente, em um espaço só seu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const recursos = [
  {
    icon: Users,
    titulo: "Um dossiê por cliente",
    texto:
      "Nicho, público, dores, desejos, posicionamento e tom de voz — tudo registrado e sempre à mão.",
  },
  {
    icon: Target,
    titulo: "Estratégia visível",
    texto: "Objetivos e diferenciais organizados para orientar cada pauta que você cria.",
  },
  {
    icon: CalendarDays,
    titulo: "Calendário de conteúdo",
    texto: "Reels, carrosséis, stories e posts distribuídos no mês, com status de produção.",
  },
  {
    icon: MessagesSquare,
    titulo: "Assistente de ideias",
    texto: "Um espaço de conversa para destravar pautas, roteiros e legendas.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen surface-grid">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <img src="/logo.png" alt="CreatorBox" className="h-8" />
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-16 pb-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Feito para quem cuida de várias marcas ao mesmo tempo
        </span>
        <h1 className="mt-8 text-balance text-5xl leading-[1.05] font-semibold sm:text-6xl">
          O cérebro criativo do seu <span className="text-gradient">portfólio de clientes</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Barbearia, restaurante, loja de bairro — cada cliente com seu próprio briefing,
          estratégia, calendário e banco de ideias. Sem planilhas espalhadas.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="shadow-glow">
            <Link to="/auth">Criar minha conta</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Já tenho conta</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-28 sm:grid-cols-2">
        {recursos.map((r) => (
          <article
            key={r.titulo}
            className="group rounded-2xl border border-border bg-card/70 p-6 transition-colors hover:border-primary/40"
          >
            <r.icon className="size-5 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">{r.titulo}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{r.texto}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
