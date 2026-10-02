// Planos de assinatura do CreatorBox. Fonte única usada pela tela de planos,
// pelo checkout e pelo webhook do Stripe. Créditos não acumulam: a cada
// renovação o saldo volta exatamente para `creditos`.
export type PlanoId = "starter" | "pro" | "agencia";

export type Plano = {
  id: PlanoId;
  nome: string;
  precoCentavos: number;
  creditos: number;
  descricao: string;
  destaque?: boolean;
  recursos: string[];
};

export const PLANOS: Plano[] = [
  {
    id: "starter",
    nome: "Starter",
    precoCentavos: 4900,
    creditos: 50,
    descricao: "Para quem está começando com 1 a 2 clientes.",
    recursos: ["50 créditos por mês", "Clientes e estratégia ilimitados", "Calendário de conteúdo"],
  },
  {
    id: "pro",
    nome: "Pro",
    precoCentavos: 9700,
    creditos: 150,
    descricao: "Para social medias em crescimento.",
    destaque: true,
    recursos: ["150 créditos por mês", "Tudo do Starter", "Roteiros e ideias com IA"],
  },
  {
    id: "agencia",
    nome: "Agência",
    precoCentavos: 19700,
    creditos: 400,
    descricao: "Para múltiplos clientes e alto volume.",
    recursos: ["400 créditos por mês", "Tudo do Pro", "Ideal para equipes e agências"],
  },
];

export function getPlano(id: string | null | undefined): Plano | undefined {
  return PLANOS.find((p) => p.id === id);
}

export function formatarPreco(centavos: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    centavos / 100,
  );
}
