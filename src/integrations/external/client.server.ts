// Cliente administrativo do Supabase próprio do usuário (service role — ignora RLS).
// Usar somente em server functions e rotas de servidor; nunca expor ao client.
import { createClient } from "@supabase/supabase-js";
import { EXTERNAL_SUPABASE_URL, createSupabaseFetch } from "./config";

function createExternalAdminClient() {
  const SERVICE_ROLE_KEY = process.env["EXTERNAL_SUPABASE_SERVICE_ROLE_KEY"];

  if (!SERVICE_ROLE_KEY) {
    const message =
      "Missing environment variable: EXTERNAL_SUPABASE_SERVICE_ROLE_KEY. Configure-a nas variáveis de ambiente do servidor (ex.: Vercel).";
    console.error(`[ExternalSupabase] ${message}`);
    throw new Error(message);
  }

  return createClient(EXTERNAL_SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SERVICE_ROLE_KEY),
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _externalAdmin: ReturnType<typeof createExternalAdminClient> | undefined;

// Cliente com service role — ignora RLS. Apenas operações confiáveis no servidor.
// Carregar dentro de handlers: const { externalSupabaseAdmin } = await import("@/integrations/external/client.server");
export const externalSupabaseAdmin = new Proxy(
  {} as ReturnType<typeof createExternalAdminClient>,
  {
    get(_, prop, receiver) {
      if (!_externalAdmin) _externalAdmin = createExternalAdminClient();
      return Reflect.get(_externalAdmin, prop, receiver);
    },
  },
);
