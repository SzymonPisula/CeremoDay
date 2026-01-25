export async function generateNotificationsForEvent(args: {
  eventId: string;
  mode: "initial" | "regen";
  transaction: any;
}) {
  // Następny krok: notyfikacje 1:1 per Task
  // T-14, T-7, T-3, T-1, T0 (in-app, bez mail/push)

  return {
    summary: { created: 0, updated: 0, skipped: 0 },
  };
}
