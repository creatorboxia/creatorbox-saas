// @ts-ignore -- tipos do bun:test não estão instalados; rode com `bun test`.
import { describe, expect, test } from "bun:test";

import { podeSeguirExclusao } from "./anexos-erros";

describe("podeSeguirExclusao", () => {
  test("segue quando a listagem não teve erro", () => {
    expect(podeSeguirExclusao(null)).toBe(true);
  });
  test("segue quando a tabela de anexos ainda não existe (Postgres)", () => {
    expect(podeSeguirExclusao({ code: "42P01" })).toBe(true);
  });
  test("segue quando a tabela de anexos ainda não existe (PostgREST)", () => {
    expect(podeSeguirExclusao({ code: "PGRST205" })).toBe(true);
  });
  test("interrompe em erro de permissão", () => {
    expect(podeSeguirExclusao({ code: "42501", message: "permission denied" })).toBe(false);
  });
  test("interrompe em erro sem código (ex.: rede)", () => {
    expect(podeSeguirExclusao({ message: "fetch failed" })).toBe(false);
  });
});
