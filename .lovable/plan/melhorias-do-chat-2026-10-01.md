# Melhorias do chat

## Objetivo
Melhorar a leitura das respostas, atualizar o modelo da IA e manter navegação, mensagens e campo de envio em áreas estáveis da tela.

## Implementação
- Adicionar os elementos de conversa recomendados e renderizar respostas do assistente com Markdown estilizado para títulos, listas, negrito, links e código no tema escuro.
- Manter mensagens do usuário com alto contraste e o campo de envio fixo na base do chat.
- Trocar o modelo OpenAI para `gpt-5.5` nos dois pontos solicitados.
- Ajustar o espaço autenticado para ocupar a altura da tela, com menu lateral imóvel e rolagem interna do conteúdo; no chat, somente a lista de mensagens rola.
- Validar tipos, lint, build e a experiência visual em desktop e celular.

## Detalhes técnicos
- Reutilizar os componentes oficiais de conversa, mensagem e entrada, preservando a consulta e o envio atuais.
- Não alterar autenticação, persistência, créditos ou outras regras do produto.
