import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { User } from "../models/User";

import { rateLimit } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import { authLoginSchema, authRegisterSchema } from "../validation/schemas";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: "Za dużo prób logowania. Spróbuj ponownie za kilka minut.",
});

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

// Helper do generowania tokena
export function signToken(payload: object): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
  return jwt.sign(payload, JWT_SECRET as any, options);
}

// --- Rejestracja ---
router.post(
  "/register",
  validateBody(authRegisterSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body as {
        email: string;
        password: string;
        name: string;
      };

      if (!email || !password || !name) {
        return res
          .status(400)
          .json({ message: "email, password i name są wymagane" });
      }

      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(409).json({ message: "Użytkownik już istnieje" });

      const password_hash = await bcrypt.hash(password, 10);

      // ✅ NIE przyjmujemy roli z body
      const user = await User.create({ email, password_hash, name });

      const token = signToken({ userId: user.id });
      return res.json({ success: true, token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Błąd serwera" });
    }
  }
);

// --- Logowanie ---
router.post(
  "/login",
  loginLimiter,
  validateBody(authLoginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        return res.status(400).json({ message: "email i password są wymagane" });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(401).json({ message: "Błędne dane logowania" });

      // ✅ Bezpiecznik: jeśli z jakiegoś powodu hash nie jest dostępny, nie wywalaj 500
      if (!user.password_hash) {
        return res.status(401).json({ message: "Błędne dane logowania" });
      }

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ message: "Błędne dane logowania" });

      const token = signToken({ userId: user.id });
      return res.json({ success: true, token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Błąd serwera" });
    }
  }
);

// --- Ja (profil + rola) ---
router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Nieautoryzowany" });

    const me = await User.findByPk(req.userId, {
      attributes: ["id", "email", "name", "role", "created_at", "updated_at"],
    });

    if (!me) return res.status(401).json({ message: "Nieautoryzowany" });
    return res.json(me);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

export default router;
