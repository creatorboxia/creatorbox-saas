// @ts-ignore -- tipos do bun:test não estão instalados; rode com `bun test`.
import { describe, expect, test } from "bun:test";

import { validarArquivo } from "./anexos";

const MB = 1024 * 1024;

describe("validarArquivo", () => {
  test("aceita MP4 de 50 MB", () => {
    expect(validarArquivo({ type: "video/mp4", size: 50 * MB }, 0)).toBeNull();
  });
  test("recusa arquivo acima de 50 MB", () => {
    expect(validarArquivo({ type: "image/png", size: 50 * MB + 1 }, 0)).not.toBeNull();
  });
  test("recusa formato fora da lista", () => {
    expect(validarArquivo({ type: "application/zip", size: MB }, 0)).not.toBeNull();
  });
  test("recusa o 11º anexo", () => {
    expect(validarArquivo({ type: "application/pdf", size: MB }, 10)).not.toBeNull();
  });
});
