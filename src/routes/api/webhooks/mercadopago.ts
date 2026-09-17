import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function assinaturaValida(params: {
  segredo: string;
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const { segredo, xSignature, xRequestId, dataId } = params;
  if (!xSignature) return false;

  let ts = "";
  let v1 = "";
  for (const parte of xSignature.split(",")) {
    const [chave, valor] = parte.split("=").map((s) => s?.trim() ?? "");
    if (chave === "ts") ts = valor;
    if (chave === "v1") v1 = valor;
  }
  if (!ts || !v1) return false;

  const manifest = `id:${dataId ?? ""};request-id:${xRequestId ?? ""};ts:${ts};`;
  const esperado = createHmac("sha256", segredo).update(manifest).digest("hex");

  const a = Buffer.from(esperado, "utf8");
  const b = Buffer.from(v1, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const segredo = process.env["MERCADOPAGO_WEBHOOK_SECRET"];
        const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
        if (!segredo || !accessToken) {
          console.error("[MercadoPago] Webhook sem variáveis de ambiente configuradas.");
          return new Response("Not configured", { status: 500 });
        }

        const corpo = (await request.json().catch(() => null)) as
          | { type?: string; action?: string; data?: { id?: string | number } }
          | null;
        if (!corpo) return new Response("Invalid body", { status: 400 });

        const url = new URL(request.url);
        const dataId = String(corpo.data?.id ?? url.searchParams.get("data.id") ?? "");

        if (
          !assinaturaValida({
            segredo,
            xSignature: request.headers.get("x-signature"),
            xRequestId: request.headers.get("x-request-id"),
            dataId,
          })
        ) {
          return new Response("Invalid signature", { status: 401 });
        }

        const tipo = corpo.type ?? corpo.action ?? "";
        if (!dataId || !tipo.includes("payment")) {
          return new Response("ignored", { status: 200 });
        }

        // Nunca confiar no payload: buscar o pagamento real na API do Mercado Pago.
        const resposta = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!resposta.ok) {
          console.error("[MercadoPago] Falha ao buscar pagamento", dataId, resposta.status);
          return new Response("Payment lookup failed", { status: 502 });
        }

        const pagamento = (await resposta.json()) as {
          id: number | string;
          status?: string;
          external_reference?: string | null;
          transaction_amount?: number;
        };

        if (pagamento.status !== "approved") {
          return new Response("not approved", { status: 200 });
        }

        const [userId, produtoId] = (pagamento.external_reference ?? "").split(":");
        if (!userId || !produtoId) {
          console.error("[MercadoPago] external_reference inválido:", pagamento.external_reference);
          return new Response("invalid reference", { status: 200 });
        }

        const { externalSupabaseAdmin } = await import("@/integrations/external/client.server");

        const { data: produto, error: erroProduto } = await externalSupabaseAdmin
          .from("produtos_creditos")
          .select("id, quantidade_creditos, nome")
          .eq("id", produtoId)
          .maybeSingle();
        if (erroProduto || !produto) {
          console.error("[MercadoPago] Produto não encontrado:", produtoId);
          return new Response("product not found", { status: 200 });
        }

        const creditos = Number((produto as { quantidade_creditos: number }).quantidade_creditos);
        const paymentId = String(pagamento.id);

        // A unique constraint em transacoes.payment_id impede processar o mesmo pagamento duas vezes.
        const { error: erroTransacao } = await externalSupabaseAdmin.from("transacoes").insert({
          user_id: userId,
          tipo: "purchase",
          quantidade_creditos: creditos,
          payment_id: paymentId,
          descricao: `Compra de créditos — ${(produto as { nome: string }).nome}`,
          valor: pagamento.transaction_amount ?? null,
        });

        if (erroTransacao) {
          // Duplicidade: já creditado em uma notificação anterior.
          if (erroTransacao.code === "23505") {
            return new Response("duplicate", { status: 200 });
          }
          if (erroTransacao.message.toLowerCase().includes("duplicate")) {
            return new Response("duplicate", { status: 200 });
          }
          console.error("[MercadoPago] Falha ao registrar transação:", erroTransacao.message);
          return new Response("insert failed", { status: 500 });
        }

        const { error: erroCredito } = await externalSupabaseAdmin.rpc("incrementar_creditos", {
          p_user_id: userId,
          p_quantidade: creditos,
        });
        if (erroCredito) {
          console.error("[MercadoPago] Falha ao creditar saldo:", erroCredito.message);
          return new Response("credit failed", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
