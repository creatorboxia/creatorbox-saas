// @ts-ignore -- tipos do bun:test não estão instalados; rode com `bun test`.
import { describe, expect, test } from "bun:test";

import {
  assinaturaDaFatura,
  decidirEventoExistente,
  escaparLike,
  PROCESSING_TIMEOUT_MS,
} from "./stripe-webhook";

describe("assinaturaDaFatura", () => {
  test("formato antigo (invoice.subscription)", () => {
    expect(assinaturaDaFatura({ subscription: "sub_1" })).toBe("sub_1");
  });
  test("formato novo (parent.subscription_details)", () => {
    expect(
      assinaturaDaFatura({ parent: { subscription_details: { subscription: "sub_2" } } }),
    ).toBe("sub_2");
  });
  test("objeto expandido", () => {
    expect(assinaturaDaFatura({ subscription: { id: "sub_3" } })).toBe("sub_3");
  });
  test("sem assinatura", () => {
    expect(assinaturaDaFatura({})).toBeUndefined();
  });
});

test("escaparLike neutraliza curingas", () => {
  expect(escaparLike("a_b%c@x.com")).toBe("a\\_b\\%c@x.com");
});

describe("decidirEventoExistente", () => {
  const agora = Date.parse("2026-10-13T12:00:00Z");
  test("processed é ignorado", () => {
    expect(decidirEventoExistente("processed", null, agora)).toBe("ignorar");
  });
  test("failed é reprocessado", () => {
    expect(decidirEventoExistente("failed", null, agora)).toBe("processar");
  });
  test("processing recente aguarda", () => {
    const criado = new Date(agora - 60_000).toISOString();
    expect(decidirEventoExistente("processing", criado, agora)).toBe("aguardar");
  });
  test("processing travado é reprocessado", () => {
    const criado = new Date(agora - PROCESSING_TIMEOUT_MS - 1).toISOString();
    expect(decidirEventoExistente("processing", criado, agora)).toBe("processar");
  });
});
