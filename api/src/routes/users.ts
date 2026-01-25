import { Router, Response } from "express";
import bcrypt from "bcryptjs";

import { User } from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { ApiError } from "../utils/apiError";
import { userUpdateSchema } from "../validation/user.schema";

const router = Router();

/**
 * GET /users/me
 * Profil zalogowanego użytkownika (bez hasła).
 */
router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) throw new ApiError(401, "UNAUTHORIZED", "Nieautoryzowany");

    const user = await User.findByPk(req.userId, {
      attributes: ["id", "email", "name", "role", "created_at"],
    });

    if (!user) throw new ApiError(404, "NOT_FOUND", "Nie znaleziono użytkownika");
    return res.json(user);
  } catch (err) {
    console.error("Error fetching profile:", err);
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "UNKNOWN_ERROR", "Błąd serwera");
  }
});

/**
 * PATCH /users/me
 * Aktualizacja profilu:
 * - name/email (opcjonalnie)
 * - zmiana hasła: current_password + new_password
 *
 * Zwraca spójne błędy walidacji z polami (fields), aby frontend mógł pokazać je inline.
 */
router.patch(
  "/me",
  authMiddleware,
  validateBody(userUpdateSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) throw new ApiError(401, "UNAUTHORIZED", "Nieautoryzowany");

      const body = req.body as {
        name?: string | null;
        email?: string | null;
        current_password?: string | null;
        new_password?: string | null;
      };

      const user = await User.findByPk(req.userId);
      if (!user) throw new ApiError(404, "NOT_FOUND", "Nie znaleziono użytkownika");

      // email unique
      if (typeof body.email === "string" && body.email.trim() && body.email !== user.email) {
        const exists = await User.findOne({ where: { email: body.email.trim() } });
        if (exists) {
          throw new ApiError(400, "VALIDATION_ERROR", "Popraw pola w formularzu.", {
            email: "Email jest już zajęty.",
          });
        }
        (user as any).email = body.email.trim();
      }

      if (body.name !== undefined) {
        (user as any).name = body.name ?? null;
      }

      const wants = typeof body.new_password === "string" && body.new_password.trim().length > 0;
      if (wants) {
        const current = typeof body.current_password === "string" ? body.current_password : "";
        const ok = await bcrypt.compare(current, (user as any).password_hash);
        if (!ok) {
          throw new ApiError(400, "VALIDATION_ERROR", "Popraw pola w formularzu.", {
            current_password: "Aktualne hasło jest nieprawidłowe.",
          });
        }

        (user as any).password_hash = await bcrypt.hash(body.new_password!.trim(), 10);
      }

      await user.save();

      const safe = await User.findByPk(req.userId, {
        attributes: ["id", "email", "name", "role", "created_at"],
      });

      return res.json({ ok: true, user: safe });
    } catch (err) {
      console.error("Error updating profile:", err);
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "UNKNOWN_ERROR", "Błąd serwera");
    }
  }
);

export default router;
