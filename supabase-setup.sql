-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  plano TEXT NOT NULL DEFAULT 'free',
  status_assinatura TEXT NOT NULL DEFAULT 'trial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  nome TEXT NOT NULL,
  nicho TEXT,
  instagram TEXT,
  cidade TEXT,
  servico_produto TEXT,
  publico_alvo TEXT,
  faixa_etaria TEXT,
  perfil_consumidor TEXT,
  dores TEXT,
  desejos TEXT,
  necessidades TEXT,
  objetivo_cliente TEXT,
  objetivo_redes_sociais TEXT,
  posicionamento TEXT,
  diferenciais TEXT,
  tom_comunicacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clientes_user_id_idx ON public.clientes(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_select_own" ON public.clientes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "clientes_insert_own" ON public.clientes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clientes_update_own" ON public.clientes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clientes_delete_own" ON public.clientes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- conversas
CREATE TABLE public.conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conversas_user_id_idx ON public.conversas(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversas TO authenticated;
GRANT ALL ON public.conversas TO service_role;
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversas_select_own" ON public.conversas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "conversas_insert_own" ON public.conversas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversas_update_own" ON public.conversas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversas_delete_own" ON public.conversas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- mensagens
CREATE TABLE public.mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mensagens_conversa_id_idx ON public.mensagens(conversa_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens TO authenticated;
GRANT ALL ON public.mensagens TO service_role;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mensagens_select_own" ON public.mensagens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversas c WHERE c.id = conversa_id AND c.user_id = auth.uid()));
CREATE POLICY "mensagens_insert_own" ON public.mensagens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversas c WHERE c.id = conversa_id AND c.user_id = auth.uid()));
CREATE POLICY "mensagens_delete_own" ON public.mensagens FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversas c WHERE c.id = conversa_id AND c.user_id = auth.uid()));

-- conteudos
CREATE TABLE public.conteudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'post' CHECK (tipo IN ('reel', 'carrossel', 'story', 'post')),
  categoria TEXT,
  titulo TEXT NOT NULL,
  ideia TEXT,
  roteiro TEXT,
  legenda TEXT,
  cta TEXT,
  status TEXT NOT NULL DEFAULT 'ideia' CHECK (status IN ('ideia', 'planejado', 'produzido', 'publicado')),
  data_planejada DATE,
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conteudos_user_id_idx ON public.conteudos(user_id);
CREATE INDEX conteudos_cliente_id_idx ON public.conteudos(cliente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conteudos TO authenticated;
GRANT ALL ON public.conteudos TO service_role;
ALTER TABLE public.conteudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conteudos_select_own" ON public.conteudos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "conteudos_insert_own" ON public.conteudos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conteudos_update_own" ON public.conteudos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conteudos_delete_own" ON public.conteudos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER clientes_touch BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER conteudos_touch BEFORE UPDATE ON public.conteudos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER conversas_touch BEFORE UPDATE ON public.conversas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- trigger functions must not be callable through the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- uso_ia: registro de consumo da inteligência artificial
-- ============================================================
CREATE TABLE IF NOT EXISTS public.uso_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS uso_ia_user_id_idx ON public.uso_ia(user_id);
GRANT SELECT, INSERT ON public.uso_ia TO authenticated;
GRANT ALL ON public.uso_ia TO service_role;
ALTER TABLE public.uso_ia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "uso_ia_select_own" ON public.uso_ia;
CREATE POLICY "uso_ia_select_own" ON public.uso_ia FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "uso_ia_insert_own" ON public.uso_ia;
CREATE POLICY "uso_ia_insert_own" ON public.uso_ia FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- perfil: foto de avatar + bucket "avatars"
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ===================== assinaturas Stripe =====================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS saldo_creditos INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS profiles_stripe_subscription_idx ON public.profiles (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (lower(email));

-- ============================================================
-- stripe_processed_events: idempotência do webhook do Stripe
-- Impede que retransmissões criem contas ou liberem créditos
-- em duplicidade. Acesso exclusivo via service role (webhook).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stripe_processed_events (
  event_id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_processed_events TO service_role;
ALTER TABLE public.stripe_processed_events ENABLE ROW LEVEL SECURITY;
-- Sem policies: ninguém além do service role (que ignora RLS) acessa.

-- ============================================================
-- anexos dos conteúdos: bucket PRIVADO "conteudo-anexos" + metadados
-- Caminho dos arquivos: {user_id}/{conteudo_id}/{arquivo}
-- Limite: 50 MB por arquivo (limite padrão do Supabase Free), 10 por conteúdo.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conteudo-anexos', 'conteudo-anexos', false, 52428800,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.conteudo_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  conteudo_id UUID NOT NULL REFERENCES public.conteudos(id) ON DELETE CASCADE,
  caminho TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  tamanho BIGINT NOT NULL CHECK (tamanho > 0 AND tamanho <= 52428800),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conteudo_anexos_conteudo_idx ON public.conteudo_anexos (conteudo_id);
GRANT SELECT, INSERT, DELETE ON public.conteudo_anexos TO authenticated;
GRANT ALL ON public.conteudo_anexos TO service_role;
ALTER TABLE public.conteudo_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anexos_select_own" ON public.conteudo_anexos;
CREATE POLICY "anexos_select_own" ON public.conteudo_anexos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "anexos_insert_own" ON public.conteudo_anexos;
CREATE POLICY "anexos_insert_own" ON public.conteudo_anexos
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND caminho LIKE auth.uid()::text || '/' || conteudo_id::text || '/%'
    AND EXISTS (SELECT 1 FROM public.conteudos c WHERE c.id = conteudo_id AND c.user_id = auth.uid())
    AND (SELECT count(*) FROM public.conteudo_anexos a WHERE a.conteudo_id = conteudo_anexos.conteudo_id) < 10
  );

DROP POLICY IF EXISTS "anexos_delete_own" ON public.conteudo_anexos;
CREATE POLICY "anexos_delete_own" ON public.conteudo_anexos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage: só a pasta do próprio usuário, e só em conteúdos dele.
DROP POLICY IF EXISTS "anexos_storage_select_own" ON storage.objects;
CREATE POLICY "anexos_storage_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'conteudo-anexos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "anexos_storage_insert_own" ON storage.objects;
CREATE POLICY "anexos_storage_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'conteudo-anexos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.conteudos c
      WHERE c.id::text = (storage.foldername(name))[2] AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "anexos_storage_delete_own" ON storage.objects;
CREATE POLICY "anexos_storage_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'conteudo-anexos' AND (storage.foldername(name))[1] = auth.uid()::text);
