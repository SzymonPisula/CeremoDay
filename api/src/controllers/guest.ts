import { Request, Response } from "express";
import { Op } from "sequelize";
import { Guest } from "../models/Guest";
import { sequelize } from "../config/database";
import { paramString } from "../utils/http";

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

type ImportResult = {
  success: boolean;
  created: number;
  skipped: number;
  errors?: string[];
};

const norm = (v: unknown) => String(v ?? "").trim();
const normLow = (v: unknown) => norm(v).toLowerCase();

const normalizePhone = (v: string) => {
  const t = v.trim();
  const hasPlus = t.startsWith("+");
  const digits = t.replace(/[^\d]/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const getGuests = async (req: Request, res: Response) => {
  try {
    const eventId = paramString(req, "eventId");
    const guests = await Guest.findAll({
      where: { event_id: eventId, parent_guest_id: null },
      include: [{ model: Guest, as: "SubGuests" }],
    });
    res.json(guests);
  } catch (error) {
    console.error("Błąd getGuests:", error);
    res.status(500).json({ message: "Błąd serwera podczas pobierania gości" });
  }
};

export const createGuest = async (req: Request, res: Response) => {
  try {
    const guest = await Guest.create({ ...req.body });
    res.json(guest);
  } catch (error) {
    console.error("Błąd createGuest:", error);
    res.status(500).json({ message: "Błąd serwera podczas dodawania gościa" });
  }
};

export const updateGuest = async (req: Request, res: Response) => {
  try {
    const id = paramString(req, "id");
    const guest = await Guest.findByPk(id);
    if (!guest) return res.status(404).json({ message: "Nie znaleziono gościa" });
    await guest.update(req.body);
    res.json(guest);
  } catch (error) {
    console.error("Błąd updateGuest:", error);
    res.status(500).json({ message: "Błąd serwera podczas aktualizacji gościa" });
  }
};

export const deleteGuest = async (req: Request, res: Response) => {
  try {
    const id = paramString(req, "id");
    const guest = await Guest.findByPk(id);
    if (!guest) return res.status(404).json({ message: "Nie znaleziono gościa" });
    await guest.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error("Błąd deleteGuest:", error);
    res.status(500).json({ message: "Błąd serwera podczas usuwania gościa" });
  }
};

export async function importGuests(req: Request, res: Response) {
  const eventId = paramString(req, "eventId");
  const items = (req.body?.items ?? []) as ImportItem[];

  if (!eventId) return res.status(400).json({ success: false, message: "Brak eventId" });
  if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "items musi być tablicą" });

  const errors: string[] = [];

  // --- twarda walidacja payloadu ---
  items.forEach((it, idx) => {
    const row = idx + 1;
    if (!it || (it.type !== "guest" && it.type !== "subguest")) {
      errors.push(`Item ${row}: zły type`);
      return;
    }
    if (!norm(it.first_name) || !norm(it.last_name)) {
      errors.push(`Item ${row}: brak first_name/last_name`);
    }
    if (it.type === "subguest" && !norm(it.parent_key)) {
      errors.push(`Item ${row}: subguest bez parent_key`);
    }
    if (it.email && !isEmail(String(it.email))) {
      errors.push(`Item ${row}: email wygląda niepoprawnie (${it.email})`);
    }
    if (it.phone) {
      const p = normalizePhone(String(it.phone));
      const digits = p.startsWith("+") ? p.slice(1) : p;
      if (digits.length < 7 || digits.length > 15) {
        errors.push(`Item ${row}: telefon wygląda niepoprawnie (${it.phone})`);
      }
    }
  });

  if (errors.length) return res.status(400).json({ success: false, errors });

  // --- pobierz istniejących gości eventu, żeby nie dublować ---
  // klucz: first+last+(phone/email)
  const existing = await Guest.findAll({ where: { event_id: eventId } });

  const existingKey = new Set<string>();
  existing.forEach((g) => {
    const k = [
      normLow(g.first_name),
      normLow(g.last_name),
      normLow(g.phone),
      normLow(g.email),
      normLow(g.parent_guest_id ?? ""),
    ].join("|");
    existingKey.add(k);
  });

  const t = await sequelize.transaction();
  try {
    const parents = items.filter((i) => i.type === "guest");
    const subs = items.filter((i) => i.type === "subguest");

    // mapowanie osób kontakowych z importu: "Imię Nazwisko" -> rekord w DB
    const parentMap = new Map<string, Guest>();

    let created = 0;
    let skipped = 0;

    // 1) Osoby kontaktowe
    for (const p of parents) {
      const first = norm(p.first_name);
      const last = norm(p.last_name);
      const phone = p.phone ? normalizePhone(String(p.phone)) : "";
      const email = p.email ? norm(String(p.email)) : "";

      const key = [first.toLowerCase(), last.toLowerCase(), phone.toLowerCase(), email.toLowerCase(), ""].join("|");
      if (existingKey.has(key)) {
        skipped++;
        // jeśli już istnieje w bazie, spróbuj znaleźć i wpiąć do parentMap po name
        const dbParent = existing.find(
          (g) =>
            normLow(g.first_name) === first.toLowerCase() &&
            normLow(g.last_name) === last.toLowerCase() &&
            !g.parent_guest_id
        );
        if (dbParent) parentMap.set(`${first} ${last}`.trim(), dbParent);
        continue;
      }

      const createdParent = await Guest.create(
        {
          event_id: eventId,
          parent_guest_id: null,
          first_name: first,
          last_name: last,
          phone: phone || null,
          email: email || null,
          relation: p.relation ?? null,
          side: p.side ?? null,
          rsvp: p.rsvp ?? null,
          allergens: p.allergens ?? null,
          notes: p.notes ?? null,
        },
        { transaction: t }
      );

      created++;
      existingKey.add(key);
      parentMap.set(`${first} ${last}`.trim(), createdParent);
    }

    // (bo subgoście mogą przychodzić w kolejnych importach)
    const existingParents = await Guest.findAll({
      where: { event_id: eventId, parent_guest_id: { [Op.is]: null } },
      transaction: t,
    });
    existingParents.forEach((p) => {
      const nameKey = `${norm(p.first_name)} ${norm(p.last_name)}`.trim();
      if (!parentMap.has(nameKey)) parentMap.set(nameKey, p);
    });

    // 2) subgoście
    for (const s of subs) {
      const first = norm(s.first_name);
      const last = norm(s.last_name);
      const phone = s.phone ? normalizePhone(String(s.phone)) : "";
      const email = s.email ? norm(String(s.email)) : "";
      const parentKey = norm(s.parent_key);

      const parent = parentMap.get(parentKey);
      if (!parent) {
errors.push(
  `Brak gościa - osoby kontaktowej "${parentKey}" (współgość: ${first} ${last})`
);
        skipped++;
        continue;
      }

      const key = [
        first.toLowerCase(),
        last.toLowerCase(),
        phone.toLowerCase(),
        email.toLowerCase(),
        String(parent.id).toLowerCase(),
      ].join("|");

      if (existingKey.has(key)) {
        skipped++;
        continue;
      }

      await Guest.create(
        {
          event_id: eventId,
          parent_guest_id: parent.id,
          first_name: first,
          last_name: last,
          phone: phone || null,
          email: email || null,
          relation: s.relation ?? null,
          side: s.side ?? null,
          rsvp: s.rsvp ?? null,
          allergens: s.allergens ?? null,
          notes: s.notes ?? null,
        },
        { transaction: t }
      );

      created++;
      existingKey.add(key);
    }

    await t.commit();

    const result: ImportResult = {
      success: true,
      created,
      skipped,
      errors: errors.length ? errors : undefined,
    };

    return res.json(result);
  } catch (e) {
    await t.rollback();
    console.error("importGuests error:", e);
    return res.status(500).json({ success: false, message: "Import nieudany" });
  }
}
