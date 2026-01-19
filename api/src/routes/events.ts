import { Router, Response } from "express";
import { Op } from "sequelize";

import { Event } from "../models/Event";
import { EventSetting } from "../models/EventSetting";
import { User } from "../models/User";
import { EventUser } from "../models/EventUser";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import WeddingDayScheduleItem from "../models/WeddingDayScheduleItem";
import { WeddingDayChecklistItem } from "../models/WeddingDayChecklistItem";
import { WeddingDayContact } from "../models/WeddingDayContact";


const router = Router();

/**
 * POST /events
 * Utworzenie nowego wydarzenia
 * - generuje access_code
 * - ustawia created_by = zalogowany użytkownik
 * - tworzy domyślne EventSetting
 * - dodaje wpis w event_users z rolą "owner"
 */

async function requireActiveMember(eventId: string, userId: string) {
  const link = await EventUser.findOne({
    where: { event_id: eventId, user_id: userId },
  });
  if (!link) return null;
  // jeśli masz status w EventUser — odblokuj to:
  // if (link.status && link.status !== "active") return null;
  return link;
}

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, start_date, location } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Nazwa wydarzenia wymagana" });
    }

    if (!req.userId) {
      return res.status(401).json({ message: "Nieautoryzowany" });
    }

    // prosty generator 6-znakowego kodu
    const access_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const event = await Event.create({
      name,
      access_code,
      start_date,
      location,
      created_by: req.userId,
    });

    // Domyślne ustawienia eventu (pusty wywiad itp.)
    await EventSetting.create({
      event_id: event.id,
      interview_data: "{}",
      theme: "",
      preferences: "",
      updated_at: new Date(),
    });

    // Dodaj tworzącego jako owner w tabeli event_users
    await EventUser.create({
      event_id: event.id,
      user_id: req.userId,
      role: "owner",
    });

    return res.json({ success: true, event });
  } catch (err) {
    console.error("Error creating event:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * GET /events
 * Pobranie wszystkich wydarzeń użytkownika (stworzone + dołączone)
 * Zwraca:
 * - created_by_me: boolean
 * - role: "owner" | "coorganizer" | "guest" (rola użytkownika w danym evencie)
 */
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Nieautoryzowany" });
    }

    const userId = req.userId;

    // Moje wydarzenia (gdzie jestem created_by)
    // UWAGA: Owner zawsze ma status "active".
    const myEvents = await Event.findAll({
      where: { created_by: userId },
      include: [
        {
          model: User,
          as: "users",
          where: { id: userId },
          required: false,
          through: {
            attributes: ["role", "status"],
          },
        },
      ],
    });

    // Dołączone wydarzenia (nie moje, ale jestem na liście uczestników)
    // Pokazujemy także "pending" (żeby użytkownik widział, że czeka na akceptację).
    // Ukrywamy ewentualne soft-usunięte (status "removed").
    const joinedEvents = await Event.findAll({
      include: [
        {
          model: User,
          as: "users",
          where: { id: userId },
          attributes: ["id"],
          through: {
            attributes: ["role", "status"],
            where: {
              status: { [Op.ne]: "removed" },
            },
          },
        },
      ],
      where: {
        created_by: { [Op.ne]: userId },
      },
    });

    // Dodajemy flagę created_by_me + rolę/status z event_users
    const allEvents = [
      ...myEvents.map((e: any) => {
        const plain = e.toJSON();
        const roleFromThrough =
          plain.users?.[0]?.EventUser?.role ?? ("owner" as "owner" | "coorganizer" | "guest");
        const statusFromThrough =
          plain.users?.[0]?.EventUser?.status ?? ("active" as "pending" | "active" | "removed");

        return {
          ...plain,
          created_by_me: true,
          role: roleFromThrough,
          status: statusFromThrough,
        };
      }),
      ...joinedEvents.map((e: any) => {
        const plain = e.toJSON();
        const roleFromThrough =
          plain.users?.[0]?.EventUser?.role ?? ("coorganizer" as "owner" | "coorganizer" | "guest");
        const statusFromThrough =
          plain.users?.[0]?.EventUser?.status ?? ("active" as "pending" | "active" | "removed");

        return {
          ...plain,
          created_by_me: false,
          role: roleFromThrough,
          status: statusFromThrough,
        };
      }),
    ];

    return res.json(allEvents);
  } catch (err) {
    console.error("Error fetching events:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * POST /events/join
 * Dołączenie do wydarzenia po access_code
 * - tworzy zgłoszenie dołączenia (status: "pending")
 * - rola domyślna: "guest" (owner może potem zatwierdzić i ewentualnie zmienić rolę)
 */
router.post("/join", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Nieautoryzowany" });
    }

    const { access_code } = req.body;
    if (!access_code) {
      return res.status(400).json({ message: "Kod wymagany" });
    }

    const event = await Event.findOne({ where: { access_code } });
    if (!event) {
      return res.status(404).json({ message: "Nie znaleziono wydarzenia" });
    }

    // sprawdzenie czy user już jest powiązany z eventem
    const existingRelation = await EventUser.findOne({
      where: {
        event_id: event.id,
        user_id: req.userId,
      },
    });

    if (existingRelation) {
      return res.status(400).json({ message: "Już dołączyłeś do tego wydarzenia" });
    }

    // Zgłoszenie dołączenia (pending)
    await EventUser.create({
      event_id: event.id,
      user_id: req.userId,
      role: "guest",
      status: "pending",
    });

    return res.json({ success: true, event, status: "pending" });
  } catch (err) {
    console.error("Error joining event:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

router.get("/:id", async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  return res.json(event);
});

/**
 * GET /events/:id/users
 * Lista uczestników wydarzenia + role + status.
 * Zwraca też moją rolę i status, żeby UI mógł pokazać "pending".
 */
router.get("/:id/users", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Nieautoryzowany" });

    const event_id = req.params.id;

    const meRel = await EventUser.findOne({
      where: { event_id, user_id: req.userId, status: { [Op.ne]: "removed" } },
    });

    if (!meRel) {
      return res.status(403).json({ message: "Brak dostępu do tego wydarzenia" });
    }

    const users = await EventUser.findAll({
      where: { event_id, status: { [Op.ne]: "removed" } },
      order: [["status", "ASC"], ["role", "ASC"]],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    return res.json({
      my_user_id: req.userId,
      my_role: meRel.role,
      my_status: meRel.status,
      users,
    });
  } catch (err) {
    console.error("Error fetching event users:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * POST /events/:id/users/:userId/approve
 * Owner akceptuje użytkownika (pending -> active).
 * Opcjonalnie można ustawić rolę (guest/coorganizer), domyślnie guest.
 */
router.post(
  "/:id/users/:userId/approve",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) return res.status(401).json({ message: "Nieautoryzowany" });

      const event_id = req.params.id;
      const targetUserId = req.params.userId;
      const role = (req.body?.role as "guest" | "coorganizer" | undefined) ?? "guest";

      const meRel = await EventUser.findOne({ where: { event_id, user_id: req.userId } });
      if (!meRel) return res.status(403).json({ message: "Brak dostępu do tego wydarzenia" });
      if (meRel.role !== "owner") {
        return res.status(403).json({ message: "Tylko właściciel może akceptować użytkowników" });
      }

      if (targetUserId === req.userId) {
        return res.status(400).json({ message: "Nie można akceptować samego siebie" });
      }

      const rel = await EventUser.findOne({ where: { event_id, user_id: targetUserId } });
      if (!rel) return res.status(404).json({ message: "Nie znaleziono użytkownika w wydarzeniu" });
      if (rel.status !== "pending") {
        return res.status(400).json({ message: "Użytkownik nie oczekuje na akceptację" });
      }

      rel.status = "active";
      rel.role = role;
      await rel.save();

      return res.json({ success: true });
    } catch (err) {
      console.error("Error approving event user:", err);
      return res.status(500).json({ message: "Błąd serwera" });
    }
  }
);

/**
 * POST /events/:id/users/:userId/reject
 * Owner odrzuca zgłoszenie (usuwa wpis z event_users).
 */
router.post(
  "/:id/users/:userId/reject",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) return res.status(401).json({ message: "Nieautoryzowany" });

      const event_id = req.params.id;
      const targetUserId = req.params.userId;

      const meRel = await EventUser.findOne({ where: { event_id, user_id: req.userId } });
      if (!meRel) return res.status(403).json({ message: "Brak dostępu do tego wydarzenia" });
      if (meRel.role !== "owner") {
        return res.status(403).json({ message: "Tylko właściciel może odrzucać użytkowników" });
      }

      if (targetUserId === req.userId) {
        return res.status(400).json({ message: "Nie można odrzucić samego siebie" });
      }

      const deleted = await EventUser.destroy({ where: { event_id, user_id: targetUserId, status: "pending" } });
      if (!deleted) return res.status(404).json({ message: "Nie znaleziono zgłoszenia do odrzucenia" });

      return res.json({ success: true });
    } catch (err) {
      console.error("Error rejecting event user:", err);
      return res.status(500).json({ message: "Błąd serwera" });
    }
  }
);

/**
 * DELETE /events/:id/users/:userId
 * Owner usuwa uczestnika.
 */
router.delete(
  "/:id/users/:userId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) return res.status(401).json({ message: "Nieautoryzowany" });

      const event_id = req.params.id;
      const targetUserId = req.params.userId;

      const meRel = await EventUser.findOne({ where: { event_id, user_id: req.userId } });
      if (!meRel) return res.status(403).json({ message: "Brak dostępu do tego wydarzenia" });
      if (meRel.role !== "owner") {
        return res.status(403).json({ message: "Tylko właściciel może usuwać użytkowników" });
      }

      if (targetUserId === req.userId) {
        return res.status(400).json({ message: "Właściciel nie może usunąć samego siebie" });
      }

      const deleted = await EventUser.destroy({ where: { event_id, user_id: targetUserId } });
      if (!deleted) return res.status(404).json({ message: "Nie znaleziono użytkownika w wydarzeniu" });

      return res.json({ success: true });
    } catch (err) {
      console.error("Error removing event user:", err);
      return res.status(500).json({ message: "Błąd serwera" });
    }
  }
);

/**
 * POST /events/:id/leave
 * Opuszczenie wydarzenia przez aktualnego użytkownika.
 */
router.post("/:id/leave", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Nieautoryzowany" });

    const event_id = req.params.id;
    const rel = await EventUser.findOne({ where: { event_id, user_id: req.userId } });

    if (!rel) return res.status(404).json({ message: "Nie jesteś uczestnikiem tego wydarzenia" });
    if (rel.role === "owner") {
      return res.status(400).json({ message: "Właściciel nie może opuścić wydarzenia" });
    }

    await EventUser.destroy({ where: { event_id, user_id: req.userId } });
    return res.json({ success: true });
  } catch (err) {
    console.error("Error leaving event:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

// ZMIANA ROLI USERA W EVENT (tylko owner)
router.patch(
  "/:id/users/:userId/role",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const eventId = req.params.id;
    const targetUserId = req.params.userId;
    const { role } = req.body as { role: "guest" | "coorganizer" };

    if (!req.userId) return res.status(401).json({ message: "Brak autoryzacji" });

    if (!["guest", "coorganizer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const myLink = await EventUser.findOne({
      where: { event_id: eventId, user_id: req.userId },
    });

    if (!myLink || myLink.role !== "owner") {
      return res.status(403).json({ message: "Only owner can change roles" });
    }

    const link = await EventUser.findOne({
      where: { event_id: eventId, user_id: targetUserId, status: "active" },
    });

    if (!link) return res.status(404).json({ message: "User not found in event" });
    if (link.role === "owner") return res.status(400).json({ message: "Cannot change owner role" });

    link.role = role;
    await link.save();

    return res.json({ success: true });
  }
);

router.get("/:id/wedding-day", authMiddleware, async (req: AuthRequest, res) => {
  const eventId = req.params.id;
  if (!req.userId) return res.status(401).json({ message: "Brak autoryzacji" });

  const member = await requireActiveMember(eventId, req.userId);
  if (!member) return res.status(403).json({ message: "Brak dostępu do wydarzenia" });

  const [schedule, checklist, contacts] = await Promise.all([
    WeddingDayScheduleItem.findAll({ where: { event_id: eventId }, order: [["time", "ASC"]] }),
    WeddingDayChecklistItem.findAll({ where: { event_id: eventId }, order: [["created_at", "ASC"]] }),
    WeddingDayContact.findAll({ where: { event_id: eventId }, order: [["created_at", "ASC"]] }),
  ]);

  return res.json({ schedule, checklist, contacts });
});

router.post("/:id/wedding-day/schedule", authMiddleware, async (req: AuthRequest, res) => {
  const eventId = req.params.id;
  if (!req.userId) return res.status(401).json({ message: "Brak autoryzacji" });

  const member = await requireActiveMember(eventId, req.userId);
  if (!member) return res.status(403).json({ message: "Brak dostępu do wydarzenia" });

  const { time, title, description, location, responsible } = req.body ?? {};
  if (!time || !title) return res.status(400).json({ message: "Brak wymaganych pól: time, title" });

  const item = await WeddingDayScheduleItem.create({
    event_id: eventId,
    time,
    title,
    description: description ?? null,
    location: location ?? null,
    responsible: responsible ?? null,
    status: "planned",
  });

  return res.json(item);
});

router.patch("/:id/wedding-day/schedule/:itemId", authMiddleware, async (req: AuthRequest, res) => {
  const eventId = req.params.id;
  const itemId = req.params.itemId;
  if (!req.userId) return res.status(401).json({ message: "Brak autoryzacji" });

  const member = await requireActiveMember(eventId, req.userId);
  if (!member) return res.status(403).json({ message: "Brak dostępu do wydarzenia" });

  const item = await WeddingDayScheduleItem.findOne({ where: { id: itemId, event_id: eventId } });
  if (!item) return res.status(404).json({ message: "Nie znaleziono pozycji harmonogramu" });

  const { time, title, description, location, responsible, status } = req.body ?? {};
  if (time !== undefined) item.time = time;
  if (title !== undefined) item.title = title;
  if (description !== undefined) item.description = description ?? null;
  if (location !== undefined) item.location = location ?? null;
  if (responsible !== undefined) item.responsible = responsible ?? null;
  if (status !== undefined) item.status = status;

  await item.save();
  return res.json(item);
});

router.delete("/:id/wedding-day/schedule/:itemId", authMiddleware, async (req: AuthRequest, res) => {
  const eventId = req.params.id;
  const itemId = req.params.itemId;
  if (!req.userId) return res.status(401).json({ message: "Brak autoryzacji" });

  const member = await requireActiveMember(eventId, req.userId);
  if (!member) return res.status(403).json({ message: "Brak dostępu do wydarzenia" });

  await WeddingDayScheduleItem.destroy({ where: { id: itemId, event_id: eventId } });

  // opcjonalnie: odpinamy checklistę od usuniętego schedule
  await WeddingDayChecklistItem.update(
    { schedule_item_id: null },
    { where: { event_id: eventId, schedule_item_id: itemId } }
  );

  return res.json({ success: true });
});

router.post("/:id/wedding-day/checklist", authMiddleware, async (req: AuthRequest, res) => {
  const eventId = req.params.id;
  if (!req.userId) return res.status(401).json({ message: "Brak autoryzacji" });

  const member = await requireActiveMember(eventId, req.userId);
  if (!member) return res.status(403).json({ message: "Brak dostępu do wydarzenia" });

  const { title, note, schedule_item_id } = req.body ?? {};
  if (!title) return res.status(400).json({ message: "Brak pola title" });

  const item = await WeddingDayChecklistItem.create({
    event_id: eventId,
    title,
    note: note ?? null,
    schedule_item_id: schedule_item_id ?? null,
    done: false,
  });

  return res.json(item);
});

router.patch("/:id/wedding-day/checklist/:itemId", authMiddleware, async (req: AuthRequest, res) => {
  const eventId = req.params.id;
  const itemId = req.params.itemId;
  if (!req.userId) return res.status(401).json({ message: "Brak autoryzacji" });

  const member = await requireActiveMember(eventId, req.userId);
  if (!member) return res.status(403).json({ message: "Brak dostępu do wydarzenia" });

  const item = await WeddingDayChecklistItem.findOne({ where: { id: itemId, event_id: eventId } });
  if (!item) return res.status(404).json({ message: "Nie znaleziono elementu checklisty" });

  const { title, note, schedule_item_id, done } = req.body ?? {};
  if (title !== undefined) item.title = title;
  if (note !== undefined) item.note = note ?? null;
  if (schedule_item_id !== undefined) item.schedule_item_id = schedule_item_id ?? null;
  if (done !== undefined) item.done = !!done;

  await item.save();
  return res.json(item);
});

router.delete("/:id/wedding-day/checklist/:itemId", authMiddleware, async (req: AuthRequest, res) => {
  const eventId = req.params.id;
  const itemId = req.params.itemId;
  if (!req.userId) return res.status(401).json({ message: "Brak autoryzacji" });

  const member = await requireActiveMember(eventId, req.userId);
  if (!member) return res.status(403).json({ message: "Brak dostępu do wydarzenia" });

  await WeddingDayChecklistItem.destroy({ where: { id: itemId, event_id: eventId } });
  return res.json({ success: true });
});

router.post("/:id/wedding-day/contacts", authMiddleware, async (req: AuthRequest, res) => {
  const eventId = req.params.id;
  if (!req.userId) return res.status(401).json({ message: "Brak autoryzacji" });

  const member = await requireActiveMember(eventId, req.userId);
  if (!member) return res.status(403).json({ message: "Brak dostępu do wydarzenia" });

  const { name, role, phone, email, note } = req.body ?? {};
  if (!name) return res.status(400).json({ message: "Brak pola name" });

  const item = await WeddingDayContact.create({
    event_id: eventId,
    name,
    role: role ?? null,
    phone: phone ?? null,
    email: email ?? null,
    note: note ?? null,
  });

  return res.json(item);
});

router.patch("/:id/wedding-day/contacts/:contactId", authMiddleware, async (req: AuthRequest, res) => {
  const eventId = req.params.id;
  const contactId = req.params.contactId;
  if (!req.userId) return res.status(401).json({ message: "Brak autoryzacji" });

  const member = await requireActiveMember(eventId, req.userId);
  if (!member) return res.status(403).json({ message: "Brak dostępu do wydarzenia" });

  const item = await WeddingDayContact.findOne({ where: { id: contactId, event_id: eventId } });
  if (!item) return res.status(404).json({ message: "Nie znaleziono kontaktu" });

  const { name, role, phone, email, note } = req.body ?? {};
  if (name !== undefined) item.name = name;
  if (role !== undefined) item.role = role ?? null;
  if (phone !== undefined) item.phone = phone ?? null;
  if (email !== undefined) item.email = email ?? null;
  if (note !== undefined) item.note = note ?? null;

  await item.save();
  return res.json(item);
});

router.delete("/:id/wedding-day/contacts/:contactId", authMiddleware, async (req: AuthRequest, res) => {
  const eventId = req.params.id;
  const contactId = req.params.contactId;
  if (!req.userId) return res.status(401).json({ message: "Brak autoryzacji" });

  const member = await requireActiveMember(eventId, req.userId);
  if (!member) return res.status(403).json({ message: "Brak dostępu do wydarzenia" });

  await WeddingDayContact.destroy({ where: { id: contactId, event_id: eventId } });
  return res.json({ success: true });
});


export default router;
