// /CeremoDay/api/src/routes/guests.ts
import { Router } from "express";
import { Op } from "sequelize";

import { Guest } from "../models/Guest";
import { EventUser } from "../models/EventUser";
import { sequelize } from "../config/database";

import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { requireActiveMemberFromBody, requireActiveMember } from "../middleware/requireActiveMember";

import { guestCreateApiSchema, guestUpdateApiSchema } from "../validation/guest.schema";

const router = Router();

// ------------------------------------------------------
// Helpers (ACL + normalizacje pod import)
// ------------------------------------------------------
async function assertActiveMember(eventId: string, userId: string) {
  const member = await EventUser.findOne({
    where: {
      event_id: eventId,
      user_id: userId,
      status: "active",
    },
  });

  return !!member;
}

function normText(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function personKey(first: unknown, last: unknown) {
  return `${normText(first)} ${normText(last)}`.replace(/\s+/g, " ").trim().toLowerCase();
}

// ------------------------------------------------------
// GET /guests/:eventId
// Lista gości eventu
// ------------------------------------------------------
router.get(
  "/:eventId",
  authMiddleware,
  requireActiveMember("eventId"),
  async (req: AuthRequest, res) => {
    const { eventId } = req.params;

    const guests = await Guest.findAll({
      where: { event_id: eventId },
      order: [
        ["parent_guest_id", "ASC"],
        ["last_name", "ASC"],
        ["first_name", "ASC"],
      ],
    });

    res.json(guests);
  }
);

// ------------------------------------------------------
// POST /guests
// Create guest
// ------------------------------------------------------
router.post(
  "/",
  authMiddleware,
  validateBody(guestCreateApiSchema),
  requireActiveMemberFromBody("event_id"),
  async (req: AuthRequest, res) => {
    const guest = await Guest.create(req.body);
    res.status(201).json(guest);
  }
);

// ------------------------------------------------------
// POST /guests/:eventId/import
// Import gości + współgości z XLSX (frontend waliduje,
// ale backend też musi być odporny).
// ------------------------------------------------------
router.post(
  "/:eventId/import",
  authMiddleware,
  requireActiveMember("eventId"),
  async (req: AuthRequest, res) => {
    const { eventId } = req.params;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        code: "UNAUTHORIZED",
        message: "Brak autoryzacji.",
      });
    }

    // dodatkowy “hard” ACL (gdyby middleware kiedyś się zmienił)
    const isMember = await assertActiveMember(eventId, userId);
    if (!isMember) {
      return res.status(403).json({
        ok: false,
        code: "FORBIDDEN",
        message: "Brak dostępu do tego wydarzenia.",
      });
    }

    const items = req.body as unknown;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        code: "INVALID_BODY",
        message: "Body musi być niepustą tablicą rekordów importu.",
      });
    }

    // Minimalna walidacja shape (nie ufamy frontendowi)
    // Format zgodny z GuestsImportPayloadItem z web.
    type ImportItem = {
      type: "guest" | "subguest";
      parent_key?: string | null;
      first_name: string;
      last_name: string;
      phone?: string | null;
      email?: string | null;
      relation?: string | null;
      side?: string | null;
      rsvp?: string | null;
      allergens?: string | null;
      notes?: string | null;
    };

    const parsed: ImportItem[] = [];

    for (let i = 0; i < items.length; i += 1) {
      const it = items[i] as Record<string, unknown>;
      const t = normText(it.type);

      if (t !== "guest" && t !== "subguest") {
        return res.status(400).json({
          ok: false,
          code: "INVALID_ITEM",
          message: `Rekord ${i + 1}: niepoprawny "type".`,
        });
      }

      const first = normText(it.first_name);
      const last = normText(it.last_name);

      if (!first || !last) {
        return res.status(400).json({
          ok: false,
          code: "INVALID_ITEM",
          message: `Rekord ${i + 1}: brak first_name/last_name.`,
        });
      }

      // subguest musi mieć parent_key
      if (t === "subguest") {
        const pk = normText(it.parent_key);
        if (!pk) {
          return res.status(400).json({
            ok: false,
            code: "MISSING_PARENT",
            message: `Rekord ${i + 1}: subguest musi mieć parent_key (Osoba kontaktowa).`,
          });
        }
      }

      parsed.push({
        type: t,
        parent_key: it.parent_key ? normText(it.parent_key) : null,
        first_name: first,
        last_name: last,
        phone: it.phone ? normText(it.phone) : null,
        email: it.email ? normText(it.email) : null,
        relation: it.relation ? normText(it.relation) : null,
        side: it.side ? normText(it.side) : null,
        rsvp: it.rsvp ? normText(it.rsvp) : null,
        allergens: it.allergens ? normText(it.allergens) : null,
        notes: it.notes ? normText(it.notes) : null,
      });
    }

    // Import w transakcji:
    // 1) tworzymy guest
    // 2) mapujemy "Imię Nazwisko" -> guest.id
    // 3) tworzymy subguest (parent_guest_id)
    try {
      const result = await sequelize.transaction(async (t) => {
        const createdGuests: Guest[] = [];
        const createdSubs: Guest[] = [];

        // klucz osoby kontaktowej -> id (tylko z importu, nie z bazy)
        const guestIdByKey = new Map<string, string>();

        // 1) Goście
        for (const it of parsed) {
          if (it.type !== "guest") continue;

          const g = await Guest.create(
            {
              event_id: eventId,
              parent_guest_id: null,
              first_name: it.first_name,
              last_name: it.last_name,
              phone: it.phone ?? null,
              email: it.email ?? null,
              relation: it.relation ?? null,
              side: it.side ?? null,
              rsvp: it.rsvp ?? null,
              allergens: it.allergens ?? null,
              notes: it.notes ?? null,
            },
            { transaction: t }
          );

          createdGuests.push(g);
          guestIdByKey.set(personKey(it.first_name, it.last_name), g.id);
        }

        // sanity: musimy mieć jakichkolwiek gości, jeśli są subguest
        const hasSubs = parsed.some((x) => x.type === "subguest");
        if (hasSubs && guestIdByKey.size === 0) {
          throw new Error("Import zawiera współgości, ale nie zawiera żadnych gości (Typ=Gość).");
        }

        // 2) Współgoście
        for (const it of parsed) {
          if (it.type !== "subguest") continue;

          const pk = normText(it.parent_key);
          const pkKey = pk.replace(/\s+/g, " ").trim().toLowerCase();

          const parentId = guestIdByKey.get(pkKey);
          if (!parentId) {
            throw new Error(
              `Nie znaleziono osoby kontaktowej "${it.parent_key}". Upewnij się, że istnieje w imporcie jako Typ=Gość i ma identyczne Imię+Nazwisko.`
            );
          }

          const sg = await Guest.create(
            {
              event_id: eventId,
              parent_guest_id: parentId,
              first_name: it.first_name,
              last_name: it.last_name,
              // zgodnie z frontendem: subguest nie ma telefonu/emaila
              phone: null,
              email: null,
              relation: it.relation ?? null,
              side: it.side ?? null,
              rsvp: it.rsvp ?? null,
              allergens: it.allergens ?? null,
              notes: it.notes ?? null,
            },
            { transaction: t }
          );

          createdSubs.push(sg);
        }

        return {
          ok: true,
          createdGuests: createdGuests.length,
          createdSubguests: createdSubs.length,
        };
      });

      return res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Błąd importu";
      return res.status(400).json({
        ok: false,
        code: "IMPORT_FAILED",
        message: msg,
      });
    }
  }
);

// ------------------------------------------------------
// PUT /guests/:id
// Update guest
// ------------------------------------------------------
router.put(
  "/:id",
  authMiddleware,
  validateBody(guestUpdateApiSchema),
  async (req: AuthRequest, res) => {
    const guest = await Guest.findByPk(req.params.id);
    if (!guest) {
      return res.status(404).json({
        ok: false,
        code: "NOT_FOUND",
        message: "Nie znaleziono gościa.",
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, code: "UNAUTHORIZED", message: "Brak autoryzacji." });
    }

    const member = await EventUser.findOne({
      where: {
        event_id: guest.event_id,
        user_id: userId,
        status: "active",
      },
    });

    if (!member) {
      return res.status(403).json({
        ok: false,
        code: "FORBIDDEN",
        message: "Brak dostępu do tego wydarzenia.",
      });
    }

    await guest.update(req.body);
    res.json(guest);
  }
);

// ------------------------------------------------------
// DELETE /guests/:id?cascade=1
// - jeśli guest jest "osobą kontaktową" i ma współgości:
//   - cascade=1 -> usuń współgości + kontakt
//   - bez cascade -> 400 i komunikat
// ------------------------------------------------------
router.delete(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res) => {
    const guest = await Guest.findByPk(req.params.id);
    if (!guest) {
      return res.status(404).json({
        ok: false,
        code: "NOT_FOUND",
        message: "Nie znaleziono gościa.",
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, code: "UNAUTHORIZED", message: "Brak autoryzacji." });
    }

    const member = await EventUser.findOne({
      where: {
        event_id: guest.event_id,
        user_id: userId,
        status: "active",
      },
    });

    if (!member) {
      return res.status(403).json({
        ok: false,
        code: "FORBIDDEN",
        message: "Brak dostępu do tego wydarzenia.",
      });
    }

    const cascadeRaw = String(req.query.cascade ?? "").toLowerCase();
    const cascade = cascadeRaw === "1" || cascadeRaw === "true" || cascadeRaw === "yes";

    const isContactPerson = !guest.parent_guest_id;

    const subCount = isContactPerson
      ? await Guest.count({ where: { parent_guest_id: guest.id } })
      : 0;

    if (isContactPerson && subCount > 0 && !cascade) {
      return res.status(400).json({
        ok: false,
        code: "HAS_SUBGUESTS",
        message: "Nie można usunąć osoby kontaktowej bez współgości.",
        fields: {
          _global:
            "Ta osoba jest osobą kontaktową i ma przypisanych współgości. Zaznacz opcję usunięcia kaskadowego, aby usunąć również współgości.",
        },
      });
    }

    await sequelize.transaction(async (t) => {
      if (isContactPerson && subCount > 0) {
        await Guest.destroy({
          where: { parent_guest_id: guest.id },
          transaction: t,
        });
      }

      await guest.destroy({ transaction: t });
    });

    return res.json({ ok: true });
  }
);

export default router;
