import { Router, Response } from "express";
import { Event } from "../models/Event";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { EventSetting } from "../models/EventSetting";
import { User } from "../models/User";
import { Op } from "sequelize";

const router = Router();

// --- Utworzenie nowego wydarzenia ---
router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, start_date, location } = req.body;
    if (!name) return res.status(400).json({ message: "Nazwa wydarzenia wymagana" });

    const access_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const event = await Event.create({
      name,
      access_code,
      start_date,
      location,
      created_by: req.userId
    });

    // Domyślne ustawienia
    await EventSetting.create({
      event_id: event.id,
      interview_data: "{}",
      theme: "",
      preferences: "",
      updated_at: new Date()
    });

    return res.json({ success: true, event });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

// --- Pobranie wszystkich wydarzeń użytkownika (stworzone + dołączone) ---
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Nieautoryzowany" });

    // Moje wydarzenia
    const myEvents = await Event.findAll({
      where: { created_by: req.userId },
    });

    // Dołączone wydarzenia (nie moje)
    const joinedEvents = await Event.findAll({
      include: [
        {
          model: User,
          as: "users",
          where: { id: req.userId },
          attributes: [],
        },
      ],
      where: { created_by: { [Op.ne]: req.userId } },
    });

    // Dodaj flagę created_by_me
    const allEvents = [
      ...myEvents.map(e => ({ ...e.toJSON(), created_by_me: true })),
      ...joinedEvents.map(e => ({ ...e.toJSON(), created_by_me: false })),
    ];

    res.json(allEvents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});


// --- Dołączenie do wydarzenia ---
router.post("/join", authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ message: "Nieautoryzowany" });

  const { access_code } = req.body;
  if (!access_code) return res.status(400).json({ message: "Kod wymagany" });

  const event = await Event.findOne({ where: { access_code } });
  if (!event) return res.status(404).json({ message: "Nie znaleziono wydarzenia" });

  const isJoined = await event.hasUser(req.userId);
  if (isJoined) return res.status(400).json({ message: "Już dołączyłeś" });

  await event.addUser(req.userId);
  res.json({ success: true, event });
});


export default router;
