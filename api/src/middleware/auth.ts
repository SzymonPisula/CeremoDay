import { Request, Response, NextFunction } from "express";
import jwt, { Secret } from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Brak tokena" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Niepoprawny token" });

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Niepoprawny token" });
  }
}
