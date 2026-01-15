export function guessPreviewKind(url: string): "image" | "pdf" | "unknown" {
  const clean = url.split("?")[0].split("#")[0].toLowerCase();

  if (clean.endsWith(".pdf")) return "pdf";
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg") || clean.endsWith(".png") || clean.endsWith(".webp"))
    return "image";

  // czasem API zwraca bez rozszerzenia – próbujemy po fragmencie
  if (clean.includes("application/pdf")) return "pdf";
  if (clean.includes("image/")) return "image";

  return "unknown";
}
