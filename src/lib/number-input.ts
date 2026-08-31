/** Coerce form / input values to a finite number (empty → fallback). */
export function coerceNumberInput(v: unknown, fallback = 0): number {
  if (v === "" || v === null || v === undefined) return fallback;
  const n = typeof v === "string" ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Parse a number input's string value (empty → 0). */
export function parseNumberInputValue(raw: string): number {
  return coerceNumberInput(raw);
}

export function isEmptyNumberValue(value: unknown): boolean {
  if (value === "" || value === null || value === undefined) return true;
  const n = typeof value === "number" ? value : Number(value);
  return !Number.isFinite(n) || n === 0;
}

export function formatNumberInputDisplay(
  value: unknown,
  emptyZero: boolean,
): string {
  if (emptyZero && isEmptyNumberValue(value)) return "";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? String(n) : "";
}
