import { describe, expect, it } from "vitest";
import {
  isPurchaseOpen,
  isValidIban,
  isValidNumber,
  msUntilPurchaseClose,
  normalizeIban,
  totalPrize,
  validateLotteryInput,
  PURCHASE_CUTOFF_MS,
} from "@/lib/lottery-logic";

describe("ventana de compra (RF-08)", () => {
  const endDate = new Date("2026-08-01T20:00:00Z");

  it("permite comprar antes del cierre", () => {
    const now = new Date(endDate.getTime() - PURCHASE_CUTOFF_MS - 1000);
    expect(isPurchaseOpen(endDate, now)).toBe(true);
  });

  it("rechaza la compra exactamente a 10 minutos del sorteo", () => {
    const now = new Date(endDate.getTime() - PURCHASE_CUTOFF_MS);
    expect(isPurchaseOpen(endDate, now)).toBe(false);
  });

  it("rechaza la compra dentro de los últimos 10 minutos", () => {
    const now = new Date(endDate.getTime() - 5 * 60 * 1000);
    expect(isPurchaseOpen(endDate, now)).toBe(false);
  });

  it("rechaza la compra tras el sorteo", () => {
    const now = new Date(endDate.getTime() + 1000);
    expect(isPurchaseOpen(endDate, now)).toBe(false);
  });

  it("msUntilPurchaseClose es coherente con isPurchaseOpen", () => {
    const now = new Date(endDate.getTime() - PURCHASE_CUTOFF_MS - 60_000);
    expect(msUntilPurchaseClose(endDate, now)).toBe(60_000);
  });
});

describe("premio total con bote (RF-04)", () => {
  it("suma premio base y bote acumulado", () => {
    expect(totalPrize({ prize: 50000, accumulatedPrize: 25000 })).toBe(75000);
  });
  it("sin bote devuelve el premio base", () => {
    expect(totalPrize({ prize: 50000, accumulatedPrize: 0 })).toBe(50000);
  });
});

describe("validación de número de boleto (RF-07)", () => {
  it("acepta números dentro del rango", () => {
    expect(isValidNumber(1, 100)).toBe(true);
    expect(isValidNumber(100, 100)).toBe(true);
  });
  it("rechaza fuera de rango, decimales y no numéricos", () => {
    expect(isValidNumber(0, 100)).toBe(false);
    expect(isValidNumber(101, 100)).toBe(false);
    expect(isValidNumber(3.5, 100)).toBe(false);
    expect(isValidNumber(NaN, 100)).toBe(false);
  });
});

describe("IBAN (RF-06)", () => {
  it("acepta IBANs válidos con y sin espacios", () => {
    expect(isValidIban("ES91 2100 0418 4502 0005 1332")).toBe(true);
    expect(isValidIban("ES9121000418450200051332")).toBe(true);
    expect(isValidIban("DE89370400440532013000")).toBe(true);
  });
  it("rechaza checksums incorrectos", () => {
    expect(isValidIban("ES9121000418450200051333")).toBe(false);
    expect(isValidIban("ES0021000418450200051332")).toBe(false);
  });
  it("rechaza formatos imposibles", () => {
    expect(isValidIban("")).toBe(false);
    expect(isValidIban("123456")).toBe(false);
    expect(isValidIban("ES91")).toBe(false);
  });
  it("normaliza a mayúsculas sin espacios", () => {
    expect(normalizeIban("es91 2100 0418 4502 0005 1332")).toBe(
      "ES9121000418450200051332"
    );
  });
});

describe("creación de lotería (RF-02)", () => {
  const now = new Date("2026-07-01T12:00:00Z");
  const valid = {
    name: "Sorteo test",
    endDate: new Date("2026-07-02T12:00:00Z"),
    prize: 50000,
    ticketPrice: 500,
    totalNumbers: 100,
  };

  it("acepta una lotería válida", () => {
    expect(validateLotteryInput(valid, now)).toEqual([]);
  });
  it("rechaza fecha pasada o sin ventana de compra", () => {
    expect(
      validateLotteryInput({ ...valid, endDate: new Date("2026-06-30T12:00:00Z") }, now)
    ).not.toEqual([]);
    expect(
      validateLotteryInput(
        { ...valid, endDate: new Date(now.getTime() + 5 * 60 * 1000) },
        now
      )
    ).not.toEqual([]);
  });
  it("rechaza premio, precio o números inválidos", () => {
    expect(validateLotteryInput({ ...valid, prize: 0 }, now)).not.toEqual([]);
    expect(validateLotteryInput({ ...valid, ticketPrice: -5 }, now)).not.toEqual([]);
    expect(validateLotteryInput({ ...valid, totalNumbers: 0 }, now)).not.toEqual([]);
    expect(validateLotteryInput({ ...valid, totalNumbers: 20000 }, now)).not.toEqual([]);
  });
  it("rechaza nombres demasiado cortos", () => {
    expect(validateLotteryInput({ ...valid, name: "ab" }, now)).not.toEqual([]);
  });
});
