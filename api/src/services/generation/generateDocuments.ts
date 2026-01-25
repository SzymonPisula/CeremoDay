export async function generateDocumentsForEvent(args: {
  eventId: string;
  mode: "initial" | "regen";
  transaction: any;
}) {
  // TODO: tutaj podepniesz istniejącą logikę tworzenia dokumentów wg wywiadu/ceremonii.
  // Na start zwracamy pusty wynik, żeby generator endpoint zadziałał end-to-end.

  return {
    summary: { created: 0, updated: 0, skipped: 0 },
    documents: [] as Array<{ id: string; task_hint?: string | null }>,
  };
}
