// Planos de assinatura do CreatorBox. Fonte única usada pela tela de planos,
// pelo checkout e pelo webhook do Stripe. Créditos não acumulam: a cada
// renovação o saldo volta exatamente para `creditos`.
//
// `precoCentavos` é só a vitrine (o que a tela mostra). A cobrança em si usa
// `stripePriceId`, o Price criado no Stripe — é ele que define o valor e a
// periodicidade reais. Mantenha os dois em sincronia ao mudar um preço.
export type PlanoId = "starter" | "pro" | "agencia";

export type Plano = {
  id: PlanoId;
  nome: string;
  precoCentavos: number;
  stripePriceId: string;
  creditos: number;
  descricao: string;
  destaque?: boolean;
  recursos: string[];
};

export const PLANOS: Plano[] = [
  {
    id: "starter",
    nome: "Starter",
    precoCentavos: 5900,
    stripePriceId: "price_1UNkcIK4G4aq7zPNknCXfj2e",
    creditos: 50,
    descricao: "Para quem está começando com 1 a 2 clientes.",
    recursos: ["50 créditos por mês", "Clientes e estratégia ilimitados", "Calendário de conteúdo"],
  },
  {
    id: "pro",
    nome: "Pro",
    precoCentavos: 9900,
    stripePriceId: "price_1UNkemK4G4aq7zPN7omEfr4H",
    creditos: 150,
    descricao: "Para social medias em crescimento.",
    destaque: true,
    recursos: ["150 créditos por mês", "Tudo do Starter", "Roteiros e ideias com IA"],
  },
  {
    id: "agencia",
    nome: "Agência",
    precoCentavos: 14700,
    stripePriceId: "price_1UNkgdK4G4aq7zPNssodAmFF",
    creditos: 400,
    descricao: "Para múltiplos clientes e alto volume.",
    recursos: ["400 créditos por mês", "Tudo do Pro", "Ideal para equipes e agências"],
  },
];

export function getPlano(id: string | null | undefined): Plano | undefined {
  return PLANOS.find((p) => p.id === id);
}

// Usado pelo webhook: quando os metadados do evento não trazem o plano, a
// assinatura ainda pode ser identificada pelo Price cobrado.
export function getPlanoPorPriceId(priceId: string | null | undefined): Plano | undefined {
  if (!priceId) return undefined;
  return PLANOS.find((p) => p.stripePriceId === priceId);
}

export function formatarPreco(centavos: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    centavos / 100,
  );
}
