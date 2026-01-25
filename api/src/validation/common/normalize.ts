export function normalizeString(v?: string | null) {
  if (v == null) return null;
  return v.trim().replace(/\s+/g, " ").normalize("NFC");
}

export function emptyToNull(v?: string | null) {
  if (v == null) return null;
  const x = normalizeString(v);
  return x === "" ? null : x;
}