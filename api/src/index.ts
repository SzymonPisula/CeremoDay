import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = +(process.env.PORT || 4000);
const JWT_SECRET: string = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "1h";

app.use(
  cors({
    origin: "http://localhost:5173",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// --- Typy ---
type UserRecord = {
  id: number;
  email: string;
  passwordHash: string;
  name: string;
};

interface JWTPayload {
  userId: number;
  iat: number;
  exp: number;
}

// --- Prosta baza in-memory ---
let users: UserRecord[] = [];
let nextUserId = 1;

// --- Helper do JWT ---
function signToken(payload: object): string {
const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, options);
}

// --- Middleware auth ---
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const raw = req.headers.authorization || req.headers["authorization"];
  if (!raw || typeof raw !== "string" || !raw.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Brak autoryzacji" });
  }

  const token = raw.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET as jwt.Secret) as JWTPayload;
    req.userId = payload.userId;
    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(401).json({ message: "Brak autoryzacji" });
  }
}

// --- Endpointy ---
app.get("/", (_, res) => res.send("✅ API działa!"));

// Rejestracja
app.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ message: "email, password i name są wymagane" });
    }

    const exists = users.find((u) => u.email === email.toLowerCase());
    if (exists) return res.status(409).json({ message: "Użytkownik już istnieje" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user: UserRecord = {
      id: nextUserId++,
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
    };
    users.push(user);

    const token = signToken({ userId: user.id });
    return res.json({ success: true, token });
  } catch (err) {
    console.error("POST /register error", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

// Logowanie
app.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ message: "email i password są wymagane" });
    }

    const user = users.find((u) => u.email === email.toLowerCase());
    if (!user) return res.status(401).json({ message: "Błędne dane logowania" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Błędne dane logowania" });

    const token = signToken({ userId: user.id });
    return res.json({ success: true, token });
  } catch (err) {
    console.error("POST /login error", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

// Profil użytkownika
app.get("/me", authMiddleware, (req: Request, res: Response) => {
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ message: "Nie znaleziono użytkownika" });

  return res.json({ id: user.id, email: user.email, name: user.name });
});

// Aktualizacja profilu
app.put("/me", authMiddleware, (req: Request, res: Response) => {
  try {
    const user = users.find((u) => u.id === req.userId);
    if (!user) return res.status(404).json({ message: "Nie znaleziono użytkownika" });

    const { name } = req.body as { name?: string };
    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Pole 'name' wymagane" });
    }

    user.name = name.trim();
    return res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("PUT /me error", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`✅ API działa na http://localhost:${PORT}`);
});
