import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase as externo } from "@/integrations/external/client";

export const BUCKET_ANEXOS = "conteudo-anexos";
export const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — limite padrão por arquivo no Supabase Free
export const MAX_ANEXOS = 10;
export const TIPOS_ACEITOS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "video/mp4": "MP4",
  "video/quicktime": "MOV",
  "application/pdf": "PDF",
};

export type Anexo = {
  id: string;
  conteudo_id: string;
  caminho: string;
  nome: string;
  mime_type: string;
  tamanho: number;
  created_at: string;
};

// A tabela fica no banco próprio e não está nos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => externo as unknown as SupabaseClient<any>;

/** Retorna a mensagem de erro, ou null se o arquivo é aceito. */
export function validarArquivo(file: { type: string; size: number }, jaAnexados: number) {
  if (!TIPOS_ACEITOS[file.type]) return "Formato não aceito. Use JPG, PNG, WebP, MP4, MOV ou PDF.";
  if (file.size <= 0) return "Arquivo vazio.";
  if (file.size > MAX_BYTES) return "Arquivo maior que 50 MB.";
  if (jaAnexados >= MAX_ANEXOS) return `Limite de ${MAX_ANEXOS} arquivos por conteúdo.`;
  return null;
}

export function formatarTamanho(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export async function listarAnexos(conteudoId: string): Promise<Anexo[]> {
  const { data, error } = await db()
    .from("conteudo_anexos")
    .select("id, conteudo_id, caminho, nome, mime_type, tamanho, created_at")
    .eq("conteudo_id", conteudoId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Anexo[];
}

export async function enviarAnexo(conteudoId: string, file: File) {
  const { data: auth } = await externo.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Sessão expirada. Entre novamente.");

  const seguro = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
  const caminho = `${userId}/${conteudoId}/${crypto.randomUUID()}-${seguro}`;

  const up = await externo.storage
    .from(BUCKET_ANEXOS)
    .upload(caminho, file, { contentType: file.type, upsert: false });
  if (up.error) throw new Error(up.error.message);

  const { error } = await db().from("conteudo_anexos").insert({
    user_id: userId,
    conteudo_id: conteudoId,
    caminho,
    nome: file.name,
    mime_type: file.type,
    tamanho: file.size,
  });
  if (error) {
    // Desfaz o upload para não deixar arquivo órfão.
    await externo.storage.from(BUCKET_ANEXOS).remove([caminho]);
    throw new Error(error.message);
  }
}

export async function removerAnexo(anexo: Anexo) {
  const st = await externo.storage.from(BUCKET_ANEXOS).remove([anexo.caminho]);
  if (st.error) throw new Error(st.error.message);
  const { data, error } = await db()
    .from("conteudo_anexos")
    .delete()
    .eq("id", anexo.id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Anexo não encontrado.");
}

/** URLs assinadas (1 hora) para arquivos privados. */
export async function urlsAssinadas(caminhos: string[]) {
  if (!caminhos.length) return {} as Record<string, string>;
  const { data, error } = await externo.storage
    .from(BUCKET_ANEXOS)
    .createSignedUrls(caminhos, 60 * 60);
  if (error) throw new Error(error.message);
  return Object.fromEntries(
    (data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]),
  );
}

export async function urlDownload(caminho: string, nome: string) {
  const { data, error } = await externo.storage
    .from(BUCKET_ANEXOS)
    .createSignedUrl(caminho, 60, { download: nome });
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
