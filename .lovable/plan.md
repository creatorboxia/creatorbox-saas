# CreatorBox — assistente de IA para social medias

SaaS onde cada social media tem seu espaço privado, cadastra os clientes que atende
(barbearias, restaurantes, lojas) e organiza estratégia, calendário e conteúdos de cada um.

## Contas e acesso

- Cadastro e login com e-mail/senha e com Google.
- Recuperação de senha por e-mail, com página própria para definir a nova senha.
- Todas as páginas internas ficam protegidas: quem não está logado vai para a tela de login.
- Cada usuário só vê os próprios dados — isolamento garantido no banco, não só na tela.
- Perfil do usuário com nome, e-mail, plano (`free`) e status da assinatura (`trial`),
  criado automaticamente no cadastro.

## Dados guardados

Cinco conjuntos de dados, todos ligados ao dono:

- **Perfis** — nome, e-mail, plano, status da assinatura.
- **Clientes** — nome, nicho, Instagram, cidade, serviço/produto, público-alvo, faixa etária,
  perfil do consumidor, dores, desejos, necessidades, objetivo do cliente, objetivo nas redes,
  posicionamento, diferenciais, tom de comunicação, ativo.
- **Conversas** — título e cliente ligado (opcional, para o chat geral).
- **Mensagens** — histórico de cada conversa (usuário/assistente).
- **Conteúdos** — tipo (reel/carrossel/story/post), categoria, título, ideia, roteiro, legenda,
  CTA, status (ideia/planejado/produzido/publicado), data planejada e um campo reservado
  para o Google Calendar (ainda sem uso).

## Telas

**Dashboard (entrada após o login)**
Números de clientes ativos, conteúdos planejados e publicados, atalho grande para o chat,
últimos clientes e próximos conteúdos agendados.

**Menu lateral**
"Início" (chat geral), lista dos clientes cadastrados e botão "Adicionar cliente".
Ao escolher um cliente, abre o submenu dele.

**Área do cliente**
- Visão geral: resumo do cliente e contagem de conteúdos por status.
- Estratégia: posicionamento, diferenciais, público, dores/desejos e tom de comunicação.
- Calendário: mês com os conteúdos nas suas datas planejadas.
- Conteúdos: lista com filtro por status/tipo, criar e editar conteúdo.
- Informações: formulário completo do cliente em seções (Informações básicas, Público,
  Estratégia), usado também no cadastro.

**Chat**
Interface completa com histórico de conversas, lista de mensagens e campo de envio.
Nesta fase as respostas são simuladas — sem IA real ligada, conforme a especificação.

## Visual

Fundo preto, roxo como destaque, tipografia moderna, cartões com contornos sutis e
transições discretas. Referência Linear/Stripe/Notion, longe de template genérico de SaaS.

## Fora desta fase

- IA real no chat (só a interface agora).
- Sincronização com Google Calendar (campo reservado, sem lógica).

## Detalhes técnicos

- Lovable Cloud ativado: Postgres + Auth + RLS.
- Tabelas `profiles`, `clientes`, `conversas`, `mensagens`, `conteudos` em `public`,
  com `GRANT`s explícitos, RLS habilitado e policies `auth.uid() = user_id`
  (mensagens via `EXISTS` na conversa dona). Trigger `on_auth_user_created` popula `profiles`.
- Rotas protegidas em `src/routes/_authenticated/`: `dashboard`, `chat`, `clientes/novo`,
  `clientes/$clienteId/{index,estrategia,calendario,conteudos,informacoes}`.
  Rotas públicas: `/` (landing com CTA de entrar), `/auth`, `/reset-password`.
- Leitura/escrita por `createServerFn` com `requireSupabaseAuth`; `attachSupabaseAuth`
  registrado em `src/start.ts`; TanStack Query com `ensureQueryData` + `useSuspenseQuery`.
- Google sign-in via `lovable.auth.signInWithOAuth("google")` e `configure_social_auth`.
- Tokens de cor/tipografia em `src/styles.css` (dark por padrão, primária roxa);
  componentes shadcn, sem cores fixas no JSX.
