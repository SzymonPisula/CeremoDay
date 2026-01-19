import { Router, Response } from "express";
import bcrypt from "bcryptjs";

import { User } from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * GET /users/me
 * Zwraca profil zalogowanego użytkownika (bez hasła).
 */
router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Nieautoryzowany" });

    const user = await User.findByPk(req.userId, {
      attributes: ["id", "email", "name", "role", "created_at"],
    });

    if (!user) return res.status(404).json({ message: "Nie znaleziono użytkownika" });
    return res.json(user);
  } catch (err) {
    console.error("Error fetching profile:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

type UpdateMeBody = {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
};

/**
 * PATCH /users/me
 * Aktualizacja danych profilu.
 * - name, email (opcjonalnie)
 * - zmiana hasła wymaga current_password + new_password
 */
router.patch("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Nieautoryzowany" });

    const body = req.body as UpdateMeBody;
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: "Nie znaleziono użytkownika" });

    // --- email unique ---
    if (typeof body.email === "string" && body.email.trim() && body.email !== user.email) {
      const exists = await User.findOne({ where: { email: body.email.trim() } });
      if (exists) return res.status(409).json({ message: "Email jest już zajęty" });
      user.email = body.email.trim();
    }

    if (typeof body.name === "string") {
      user.name = body.name.trim();
    }

    // --- zmiana hasła ---
    const wantsPasswordChange =
      typeof body.new_password === "string" && body.new_password.trim().length > 0;

    if (wantsPasswordChange) {
      if (!body.current_password || typeof body.current_password !== "string") {
        return res.status(400).json({ message: "Podaj aktualne hasło" });
      }

      const ok = await bcrypt.compare(body.current_password, user.password_hash);
      if (!ok) return res.status(401).json({ message: "Aktualne hasło jest nieprawidłowe" });

      if (body.new_password.trim().length < 6) {
        return res.status(400).json({ message: "Nowe hasło musi mieć co najmniej 6 znaków" });
      }

      user.password_hash = await bcrypt.hash(body.new_password.trim(), 10);
    }

    await user.save();

    const safe = await User.findByPk(req.userId, {
      attributes: ["id", "email", "name", "role", "created_at"],
    });

    return res.json({ success: true, user: safe });
  } catch (err) {
    console.error("Error updating profile:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

export default router;
