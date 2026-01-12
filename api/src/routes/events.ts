import { Router, Response } from "express";
import { Op } from "sequelize";

import { Event } from "../models/Event";
import { EventSetting } from "../models/EventSetting";
import { User } from "../models/User";
import { EventUser } from "../models/EventUser";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * POST /events
 * Utworzenie nowego wydarzenia
 * - generuje access_code
 * - ustawia created_by = zalogowany użytkownik
 * - tworzy domyślne EventSetting
 * - dodaje wpis w event_users z rolą "owner"
 */
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
    const myEvents = await Event.findAll({
      where: { created_by: userId },
      include: [
        {
          model: User,
          as: "users",
          where: { id: userId },
          required: false,
          through: {
            attributes: ["role"],
          },
        },
      ],
    });

    // Dołączone wydarzenia (nie moje, ale jestem na liście uczestników)
    const joinedEvents = await Event.findAll({
      include: [
        {
          model: User,
          as: "users",
          where: { id: userId },
          attributes: ["id"],
          through: {
            attributes: ["role"],
          },
        },
      ],
      where: {
        created_by: { [Op.ne]: userId },
      },
    });

    // Dodajemy flagę created_by_me + rolę z event_users
    const allEvents = [
      ...myEvents.map((e: any) => {
        const plain = e.toJSON();
        const roleFromThrough =
          plain.users?.[0]?.EventUser?.role ?? ("owner" as "owner" | "coorganizer" | "guest");

        return {
          ...plain,
          created_by_me: true,
          role: roleFromThrough,
        };
      }),
      ...joinedEvents.map((e: any) => {
        const plain = e.toJSON();
        const roleFromThrough =
          plain.users?.[0]?.EventUser?.role ?? ("coorganizer" as "owner" | "coorganizer" | "guest");

        return {
          ...plain,
          created_by_me: false,
          role: roleFromThrough,
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
 * - jeśli event istnieje i nie jest jeszcze przypisany do usera
 * - dodaje wpis w event_users z rolą "coorganizer"
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

    // dodanie usera jako współorganizator
    await EventUser.create({
      event_id: event.id,
      user_id: req.userId,
      role: "coorganizer",
    });

    return res.json({ success: true, event });
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


export default router;
