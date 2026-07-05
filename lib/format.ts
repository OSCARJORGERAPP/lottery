/** Importes en céntimos → "1.234,56 €" */
export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Rellena un número de boleto a ancho fijo: 7 → "007" */
export function padNumber(n: number, totalNumbers: number): string {
  return String(n).padStart(String(totalNumbers).length, "0");
}
