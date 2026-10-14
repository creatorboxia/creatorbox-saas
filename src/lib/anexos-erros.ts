// Regras puras usadas antes de excluir conteúdos/clientes com anexos.

type ErroConsulta = { code?: string; message?: string } | null | undefined;

/** Tabela de anexos ainda não criada no banco (Postgres 42P01 ou PostgREST PGRST205). */
export function tabelaAnexosAusente(erro: ErroConsulta) {
  return erro?.code === "42P01" || erro?.code === "PGRST205";
}

/**
 * Decide se a exclusão pode seguir após listar os anexos.
 * Só segue sem erro ou quando a tabela ainda não existe; qualquer outra falha interrompe.
 */
export function podeSeguirExclusao(erro: ErroConsulta) {
  return !erro || tabelaAnexosAusente(erro);
}
