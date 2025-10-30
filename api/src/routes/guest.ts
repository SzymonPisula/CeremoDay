import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { getGuests, createGuest, updateGuest, deleteGuest } from "../controllers/guest";

const router = Router();

router.get("/:eventId", authMiddleware, getGuests);
router.post("/", authMiddleware, createGuest);
router.put("/:id", authMiddleware, updateGuest);
router.delete("/:id", authMiddleware, deleteGuest);

export default router;
