// Conexão com o projeto Supabase próprio do usuário.
// A chave abaixo é a chave pública (publishable/anon), segura para ficar no código.
export const EXTERNAL_SUPABASE_URL = "https://qiarsjpyrluqdcqgtihr.supabase.co";
export const EXTERNAL_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_AibJNWwVUnDJe74gU5WExg_zH4H5lYK";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

export function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // Chaves novas do Supabase são opacas, não são JWTs.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}
