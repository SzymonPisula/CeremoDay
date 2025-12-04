import { Router } from "express";
import { upload } from "../config/upload";

import {
  getBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  createItem,
  updateItem,
  deleteItem
} from "../controllers/inspirationsController";

const router = Router();

// Boards
router.get("/events/:eventId/inspirations/boards", getBoards);
router.post("/events/:eventId/inspirations/boards", createBoard);
router.put("/inspirations/boards/:id", updateBoard);
router.delete("/inspirations/boards/:id", deleteBoard);

// Items
router.post("/events/:eventId/inspirations/boards/:boardId/items", upload.single("file"), createItem);
router.put("/inspirations/items/:id", upload.single("file"), updateItem);
router.delete("/inspirations/items/:id", deleteItem);

export default router;
