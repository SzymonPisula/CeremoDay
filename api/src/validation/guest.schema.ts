import { z } from "zod";

export const uuid = z.string().uuid();

export const guestBaseSchema = z.object({
  first_name: z.string().min(1, "Imię jest wymagane"),
  last_name: z.string().min(1, "Nazwisko jest wymagane"),

  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),

  relation: z.string().optional().nullable(),
  side: z.string().optional().nullable(),
  rsvp: z.string().optional().nullable(),

  allergens: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),

  parent_guest_id: uuid.optional().nullable(),
});

/**
 * SCHEMA DLA API (CRITICAL)
 * - zawiera event_id
 * - NIE stripuje pól
 */
export const guestCreateApiSchema = guestBaseSchema.extend({
  event_id: uuid,
}).passthrough();

export const guestUpdateApiSchema = guestBaseSchema.partial().passthrough();
