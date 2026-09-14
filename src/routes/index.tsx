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

const passos = [
  {
    numero: "01",
    titulo: "Cadastre o cliente",
    texto: "Nicho, público, dores, desejos e tom de voz em um formulário guiado.",
  },
  {
    numero: "02",
    titulo: "Monte a estratégia",
    texto: "Objetivos e diferenciais viram direção clara para as pautas do mês.",
  },
  {
    numero: "03",
    titulo: "Produza sem travar",
    texto: "Calendário, ideias e roteiros no mesmo lugar, com o assistente ao lado.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen surface-grid">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo size="md" />
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-24 pb-28 text-center sm:pt-32">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs tracking-wide text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Feito para quem cuida de várias marcas ao mesmo tempo
        </span>
        <h1 className="mt-10 text-balance text-5xl leading-[1.03] font-semibold sm:text-6xl lg:text-7xl">
          O cérebro criativo do seu <span className="text-gradient">portfólio de clientes</span>
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Barbearia, restaurante, loja de bairro — cada cliente com seu próprio briefing,
          estratégia, calendário e banco de ideias. Sem planilhas espalhadas.
        </p>
        <div className="mt-11 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="shadow-glow">
            <Link to="/auth">Criar minha conta</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Já tenho conta</Link>
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Grátis para começar — sem cartão de crédito.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Como funciona
          </span>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Três passos e o mês está pronto</h2>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {passos.map((p) => (
            <article
              key={p.numero}
              className="rounded-2xl border border-border bg-card/50 p-7 transition-colors hover:border-primary/40"
            >
              <span className="font-display text-sm font-semibold text-primary">{p.numero}</span>
              <h3 className="mt-4 text-lg font-semibold">{p.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            O que tem dentro
          </span>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Tudo o que um social media precisa lembrar
          </h2>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {recursos.map((r) => (
            <article
              key={r.titulo}
              className="group rounded-2xl border border-border bg-card/70 p-7 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/25">
                <r.icon className="size-5 text-primary" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{r.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-32">
        <div className="rounded-3xl border border-primary/30 bg-primary/10 px-8 py-14 text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Comece com o seu primeiro cliente hoje
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Leve minutos para cadastrar e nunca mais procure o briefing em outra aba.
          </p>
          <Button asChild size="lg" className="mt-9 shadow-glow">
            <Link to="/auth">Criar minha conta</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <Logo size="xs" />
          <p className="text-xs text-muted-foreground">
            CreatorBox — organização criativa para social medias.
          </p>
        </div>
      </footer>
    </main>
  );
}
