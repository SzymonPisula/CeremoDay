import { z } from "zod";
import { isoDate } from "./common/date";
import { money } from "./common/number";

export const ceremonyTypeValues = ["CIVIL", "CHURCH", "RECEPTION_ONLY"] as const;
export const venueChoiceValues = ["WEDDING_HALL", "RURAL_VENUE"] as const;
export const musicProviderValues = ["DJ", "BAND"] as const;
export const guestListStatusValues = ["ready", "partial", "not_started"] as const;

export const interviewSchema = z.object({
  event_date: isoDate,
  ceremony_type: z.enum(ceremonyTypeValues, { message: "Nieprawidłowy typ ceremonii" }),
  guest_list_status: z.enum(guestListStatusValues, { message: "Nieprawidłowy status listy gości" }),
  venue_choice: z.enum(venueChoiceValues, { message: "Nieprawidłowy wybór miejsca" }),
  music_provider_choice: z.enum(musicProviderValues, { message: "Nieprawidłowy wybór muzyki" }),
  wedding_day_enabled: z.boolean(),
  has_budget: z.boolean(),
  initial_budget: money.optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.has_budget && (data.initial_budget == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["initial_budget"],
      message: "Budżet startowy jest wymagany, gdy zaznaczysz że masz budżet",
    });
  }
});