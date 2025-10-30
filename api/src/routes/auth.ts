import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { User } from "../models/User";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

// Helper do generowania tokena
export function signToken(payload: object): string {
  // Rzutowanie na any obejmuje problem typowania w TS
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
  return jwt.sign(payload, JWT_SECRET as any, options);
}

// --- Rejestracja ---
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: "email, password i name są wymagane" });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ message: "Użytkownik już istnieje" });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password_hash, name, role });

    const token = signToken({ userId: user.id });
    return res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

// --- Logowanie ---
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email i password są wymagane" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: "Błędne dane logowania" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Błędne dane logowania" });

    const token = signToken({ userId: user.id });
    return res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

export default router;
