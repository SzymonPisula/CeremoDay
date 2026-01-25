export function isStrictDecimalString(value: string): boolean {
  // digits, optional decimal separator . or , with 1-2 digits
  // disallow e/E/+/-
  return /^[0-9]{1,9}([.,][0-9]{1,2})?$/.test(value);
}

export function parseDecimal(value: string): number | null {
  const v = value.trim();
  if (!isStrictDecimalString(v)) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function isStrictIntString(value: string): boolean {
  return /^[0-9]+$/.test(value);
}
