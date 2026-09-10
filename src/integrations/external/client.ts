import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY,
  EXTERNAL_SUPABASE_URL,
  createSupabaseFetch,
} from "./config";

function createExternalClient() {
  return createClient<Database>(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(EXTERNAL_SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
}

let _client: ReturnType<typeof createExternalClient> | undefined;

// import { supabase } from "@/integrations/external/client";
export const supabase = new Proxy({} as ReturnType<typeof createExternalClient>, {
  get(_, prop, receiver) {
    if (!_client) _client = createExternalClient();
    return Reflect.get(_client, prop, receiver);
  },
});
