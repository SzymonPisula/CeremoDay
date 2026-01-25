import { z } from "zod";

export const notificationFrequencyValues = ["only_critical", "daily", "every_3_days", "weekly"] as const;

export const notificationCreateSchema = z.object({
  task_id: z.string().uuid("Powiadomienie musi być powiązane z poprawnym zadaniem"),
  frequency: z.enum(notificationFrequencyValues, { message: "Nieprawidłowa częstotliwość powiadomień" }),
});

export const notificationMarkReadSchema = z.object({
  ids: z.array(z.string().uuid()).max(200, "Możesz oznaczyć max 200 powiadomień naraz").optional(),
});