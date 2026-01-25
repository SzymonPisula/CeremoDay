export function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function normalizeUnicodeNFC(s: string): string {
  try {
    return s.normalize("NFC");
  } catch {
    return s;
  }
}

export function normalizeInputString(s: unknown): string {
  const x = typeof s === "string" ? s : String(s ?? "");
  return normalizeSpaces(normalizeUnicodeNFC(x));
}

export function toNullIfEmpty(s: unknown): string | null {
  const x = normalizeInputString(s);
  return x === "" ? null : x;
}

export function titleCasePL(input: string): string {
  // Jan, Anna Maria, Nowak-Kowalska
  return input
    .split(/([ -])/g)
    .map((part) => {
      if (part === " " || part === "-") return part;
      const p = part.toLowerCase();
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join("");
}

export function digitsOnly(input: string): string {
  return input.replace(/\D+/g, "");
}

export function normalizePLPhone(input: string): string {
  const d = digitsOnly(input);
  // accept +48 prefix
  if (d.length === 11 && d.startsWith("48")) return d.slice(2);
  return d;
}
