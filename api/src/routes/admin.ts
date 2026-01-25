// CeremoDay/api/src/routes/admin.ts
import { Router, Response } from "express";
import bcrypt from "bcryptjs";

import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { requireAdmin } from "../middleware/requireAdmin";
import { ApiError } from "../utils/apiError";
import { User } from "../models/User";
import { adminCreateUserSchema, adminPatchUserSchema } from "../validation/schemas";

const router = Router();

// requireAdmin przeniesione do middleware (api/src/middleware/requireAdmin.ts)

/**
 * GET /admin/users
 * Lista wszystkich użytkowników (bez hashy haseł).
 */
router.get("/users", authMiddleware, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "email", "name", "role", "created_at", "updated_at"],
      order: [["created_at", "DESC"]],
    });

    return res.json(users);
  } catch (err) {
    console.error("Error listing users (admin)", err);
    return res.status(500).json({ message: "Błąd pobierania użytkowników" });
  }
});

/**
 * POST /admin/users
 * Dodanie nowego użytkownika (admin).
 * - pełna walidacja zod
 * - spójny błąd walidacji/konfliktu przez ApiError
 */
router.post(
  "/users",
  authMiddleware,
  requireAdmin,
  validateBody(adminCreateUserSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body as {
        email: string;
        password: string;
        name: string | null;
        role: "user" | "admin";
      };

      const exists = await User.findOne({ where: { email: body.email } });
      if (exists) {
        throw new ApiError(400, "VALIDATION_ERROR", "Popraw pola w formularzu.", {
          email: "Użytkownik z takim emailem już istnieje.",
        });
      }

      const password_hash = await bcrypt.hash(body.password, 10);

      const user = await User.create({
        email: body.email,
        password_hash,
        name: body.name ?? null,
        role: body.role ?? "user",
      } as any);

      return res.status(201).json({
        id: (user as any).id,
        email: (user as any).email,
        name: (user as any).name ?? null,
        role: (user as any).role ?? "user",
        created_at: (user as any).created_at ?? null,
        updated_at: (user as any).updated_at ?? null,
      });
    } catch (err) {
      // Express 5: async throw przechodzi do errorHandler
      if (err instanceof ApiError) throw err;
      console.error("Error creating user (admin)", err);
      throw new ApiError(500, "UNKNOWN_ERROR", "Błąd tworzenia użytkownika");
    }
  }
);

/**
 * PATCH /admin/users/:userId
 * Edycja użytkownika (name/email/role) + opcjonalnie zmiana hasła.
 * - pełna walidacja zod
 * - spójne błędy (fields)
 */
router.patch(
  "/users/:userId",
  authMiddleware,
  requireAdmin,
  validateBody(adminPatchUserSchema),
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    const body = req.body as {
      name?: string | null;
      email?: string;
      role?: "user" | "admin" | null;
      password?: string;
    };

    const user = await User.findByPk(userId);
    if (!user) throw new ApiError(404, "NOT_FOUND", "Użytkownik nie znaleziony");

    // email: sprawdź unikalność
    if (body.email !== undefined) {
      const exists = await User.findOne({ where: { email: body.email } });
      if (exists && (exists as any).id !== (user as any).id) {
        throw new ApiError(400, "VALIDATION_ERROR", "Popraw pola w formularzu.", {
          email: "Użytkownik z takim emailem już istnieje.",
        });
      }
      (user as any).email = body.email;
    }

    if (body.name !== undefined) (user as any).name = body.name;
    if (body.role !== undefined) (user as any).role = body.role;

    if (typeof body.password === "string") {
      (user as any).password_hash = await bcrypt.hash(body.password, 10);
    }

    await user.save();

    return res.json({
      id: (user as any).id,
      email: (user as any).email,
      name: (user as any).name ?? null,
      role: (user as any).role ?? null,
      created_at: (user as any).created_at ?? null,
      updated_at: (user as any).updated_at ?? null,
    });
  }
);

export default router;
