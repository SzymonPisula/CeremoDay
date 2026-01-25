import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { generateForEvent } from "../controllers/generateController";

const router = Router();

// POST /events/:id/generate
router.post("/events/:id/generate", authMiddleware, generateForEvent);

export default router;
