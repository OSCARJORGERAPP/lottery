// Lógica pura de la lotería: sin BD ni red, para que sea testeable en CI
// (los jobs de test no tienen MongoDB — ver AGENTS.md §CI).

/** La compra cierra 10 minutos antes del sorteo (RF-08). */
export const PURCHASE_CUTOFF_MS = 10 * 60 * 1000;

export function isPurchaseOpen(endDate: Date, now: Date = new Date()): boolean {
  return now.getTime() < endDate.getTime() - PURCHASE_CUTOFF_MS;
}

/** Milisegundos hasta el cierre de compra (negativo si ya cerró). */
export function msUntilPurchaseClose(endDate: Date, now: Date = new Date()): number {
  return endDate.getTime() - PURCHASE_CUTOFF_MS - now.getTime();
}

/** La fecha del sorteo ya pasó: se puede ejecutar el sorteo (RF-09). */
export function hasEnded(endDate: Date, now: Date = new Date()): boolean {
  return endDate.getTime() <= now.getTime();
}

/** Premio total = premio base + bote acumulado de sorteos desiertos (RF-04). */
export function totalPrize(lottery: { prize: number; accumulatedPrize: number }): number {
  return lottery.prize + lottery.accumulatedPrize;
}

export function isValidNumber(number: number, totalNumbers: number): boolean {
  return Number.isInteger(number) && number >= 1 && number <= totalNumbers;
}

/** Validación IBAN: formato + checksum mod-97 (ISO 13616). */
export function isValidIban(input: string): boolean {
  const iban = input.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  // Mover los 4 primeros caracteres al final y convertir letras a números (A=10..Z=35)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const value = ch >= "A" ? (ch.charCodeAt(0) - 55).toString() : ch;
    for (const digit of value) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export interface CreateLotteryInput {
  name: string;
  endDate: Date;
  prize: number;
  ticketPrice: number;
  totalNumbers: number;
}

/** Valida los datos de creación de una lotería (RF-02). Devuelve lista de errores. */
export function validateLotteryInput(input: CreateLotteryInput, now: Date = new Date()): string[] {
  const errors: string[] = [];
  if (!input.name || input.name.trim().length < 3) {
    errors.push("El nombre debe tener al menos 3 caracteres");
  }
  if (!(input.endDate instanceof Date) || isNaN(input.endDate.getTime())) {
    errors.push("La fecha del sorteo no es válida");
  } else if (input.endDate.getTime() <= now.getTime() + PURCHASE_CUTOFF_MS) {
    errors.push("La fecha del sorteo debe dejar al menos 10 minutos de ventana de compra");
  }
  if (!Number.isInteger(input.prize) || input.prize <= 0) {
    errors.push("El premio debe ser un importe positivo");
  }
  if (!Number.isInteger(input.ticketPrice) || input.ticketPrice <= 0) {
    errors.push("El precio del boleto debe ser un importe positivo");
  }
  if (!Number.isInteger(input.totalNumbers) || input.totalNumbers < 1 || input.totalNumbers > 10000) {
    errors.push("La cantidad de números debe estar entre 1 y 10000");
  }
  return errors;
}
