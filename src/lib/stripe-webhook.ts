// Funções puras do webhook da Stripe (sem rede/banco), testáveis isoladamente.

export type StatusEvento = "processing" | "processed" | "failed";

// Um evento "processing" mais antigo que isso é tratado como travado
// (ex.: a função caiu no meio) e pode ser reprocessado.
export const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

type RefId = string | { id?: string } | null | undefined;

function idDe(ref: RefId) {
  if (!ref) return undefined;
  return typeof ref === "string" ? ref : ref.id;
}

export type Fatura = {
  billing_reason?: string;
  subscription?: RefId;
  parent?: { subscription_details?: { subscription?: RefId } | null } | null;
};

// APIs antigas: invoice.subscription. A partir de 2025-03-31 (basil):
// invoice.parent.subscription_details.subscription. Aceita os dois formatos.
export function assinaturaDaFatura(fatura: Fatura) {
  return idDe(fatura.subscription) ?? idDe(fatura.parent?.subscription_details?.subscription);
}

// Escapa curingas do ILIKE para que o e-mail seja comparado literalmente,
// apenas ignorando maiúsculas/minúsculas.
export function escaparLike(valor: string) {
  return valor.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type Decisao = "processar" | "ignorar" | "aguardar";

// Decide o que fazer com um evento que já tem registro na tabela de controle.
export function decidirEventoExistente(
  status: string,
  criadoEm: string | null,
  agora = Date.now(),
): Decisao {
  if (status === "processed") return "ignorar";
  if (status === "failed") return "processar";
  if (status === "processing") {
    const t = criadoEm ? Date.parse(criadoEm) : NaN;
    if (Number.isNaN(t) || agora - t > PROCESSING_TIMEOUT_MS) return "processar";
    return "aguardar";
  }
  return "processar";
}
