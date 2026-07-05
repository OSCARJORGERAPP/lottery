import { describe, expect, it } from "vitest";
import { formatMoney, padNumber } from "@/lib/format";

describe("formatMoney", () => {
  it("convierte céntimos a euros con formato es-ES", () => {
    // Intl usa espacio no separable antes de €
    expect(formatMoney(50000).replace(/ /g, " ")).toBe("500,00 €");
    expect(formatMoney(123456).replace(/ /g, " ")).toBe("1234,56 €");
  });
});

describe("padNumber", () => {
  it("rellena al ancho del total de números", () => {
    expect(padNumber(7, 100)).toBe("007");
    expect(padNumber(7, 50)).toBe("07");
    expect(padNumber(42, 9999)).toBe("0042");
  });
});
