// CeremoDay/api/src/routes/inspirations.ts
import { Router, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

import InspirationBoard from "../models/InspirationBoard";
import InspirationItem from "../models/InspirationItem";
import { AuthRequest, authMiddleware } from "../middleware/auth";

const router = Router();

// 🔹 Upewniamy się, że katalog na uploady istnieje
const uploadsDir = path.join(__dirname, "..", "..", "uploads", "inspirations");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
    cb(null, `${Date.now()}-${base || "inspiration"}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// =====================================
// TABLICE INSPIRACJI
// =====================================

/**
 * GET /inspirations/events/:eventId/boards
 * Lista tablic inspiracji dla konkretnego wydarzenia
 */
router.get(
  "/events/:eventId/boards",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const boards = await InspirationBoard.findAll({
        where: { event_id: eventId },
        order: [["created_at", "ASC"]],
      });

      return res.json(boards);
    } catch (err) {
      console.error("Error fetching inspiration boards:", err);
      return res
        .status(500)
        .json({ message: "Błąd pobierania tablic inspiracji" });
    }
  }
);

/**
 * POST /inspirations/events/:eventId/boards
 * Tworzy nową tablicę inspiracji
 */
router.post(
  "/events/:eventId/boards",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const { name, description, color, emoji } = req.body as {
        name?: string;
        description?: string;
        color?: string;
        emoji?: string;
      };

      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "Nazwa tablicy jest wymagana" });
      }

      const board = await InspirationBoard.create({
        event_id: eventId,
        name: name.trim(),
        description: description ?? null,
        color: color ?? null,
        emoji: emoji ?? null,
      } as any);

      return res.status(201).json(board);
    } catch (err) {
      console.error("Error creating inspiration board:", err);
      return res
        .status(500)
        .json({ message: "Błąd tworzenia tablicy inspiracji" });
    }
  }
);

/**
 * PUT /inspirations/boards/:boardId
 * Aktualizuje tablicę inspiracji
 */
router.put(
  "/boards/:boardId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { boardId } = req.params;
      const { name, description, color, emoji } = req.body as {
        name?: string;
        description?: string;
        color?: string;
        emoji?: string;
      };

      const board = await InspirationBoard.findByPk(boardId);
      if (!board) {
        return res
          .status(404)
          .json({ message: "Tablica inspiracji nie została znaleziona" });
      }

      const b = board as any;

      if (name !== undefined) b.name = name.trim();
      if (description !== undefined) b.description = description ?? null;
      if (color !== undefined) b.color = color ?? null;
      if (emoji !== undefined) b.emoji = emoji ?? null;

      await board.save();

      return res.json(board);
    } catch (err) {
      console.error("Error updating inspiration board:", err);
      return res
        .status(500)
        .json({ message: "Błąd aktualizacji tablicy inspiracji" });
    }
  }
);

/**
 * DELETE /inspirations/boards/:boardId
 * Usuwa tablicę inspiracji wraz z jej elementami
 */
router.delete(
  "/boards/:boardId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { boardId } = req.params;

      const board = await InspirationBoard.findByPk(boardId);
      if (!board) {
        return res
          .status(404)
          .json({ message: "Tablica inspiracji nie została znaleziona" });
      }

      // usuwamy powiązane inspiracje
      await InspirationItem.destroy({
        where: { board_id: boardId },
      });

      await board.destroy();
      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting inspiration board:", err);
      return res
        .status(500)
        .json({ message: "Błąd usuwania tablicy inspiracji" });
    }
  }
);

// =====================================
// ELEMENTY (INSPIRACJE) W TABLICACH
// =====================================

/**
 * GET /inspirations/boards/:boardId/items
 * Lista inspiracji w tablicy
 */
router.get(
  "/boards/:boardId/items",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { boardId } = req.params;

      const items = await InspirationItem.findAll({
        where: { board_id: boardId },
        order: [["created_at", "ASC"]],
      });

      return res.json(items);
    } catch (err) {
      console.error("Error fetching inspiration items:", err);
      return res
        .status(500)
        .json({ message: "Błąd pobierania inspiracji" });
    }
  }
);

/**
 * POST /inspirations/boards/:boardId/items
 * Dodaje inspirację do tablicy
 */
router.post(
  "/boards/:boardId/items",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { boardId } = req.params;
      const {
        title,
        description,
        category,
        tags,
        source_url,
      } = req.body as {
        title?: string;
        description?: string;
        category?:
          | "DEKORACJE"
          | "KWIATY"
          | "STROJE"
          | "PAPETERIA"
          | "INNE";
        tags?: string;
        source_url?: string;
      };

      if (!title || typeof title !== "string") {
        return res
          .status(400)
          .json({ message: "Tytuł inspiracji jest wymagany" });
      }

      const item = await InspirationItem.create({
        board_id: boardId,
        title: title.trim(),
        description: description ?? null,
        category: category ?? null,
        tags: tags ?? null,
        source_url: source_url ?? null,
        image_url: null,
      } as any);

      return res.status(201).json(item);
    } catch (err) {
      console.error("Error creating inspiration item:", err);
      return res
        .status(500)
        .json({ message: "Błąd tworzenia inspiracji" });
    }
  }
);

/**
 * PUT /inspirations/items/:itemId
 * Aktualizuje inspirację
 */
router.put(
  "/items/:itemId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { itemId } = req.params;
      const {
        title,
        description,
        category,
        tags,
        source_url,
      } = req.body as {
        title?: string;
        description?: string;
        category?:
          | "DEKORACJE"
          | "KWIATY"
          | "STROJE"
          | "PAPETERIA"
          | "INNE";
        tags?: string;
        source_url?: string;
      };

      const item = await InspirationItem.findByPk(itemId);
      if (!item) {
        return res
          .status(404)
          .json({ message: "Inspiracja nie została znaleziona" });
      }

      const i = item as any;

      if (title !== undefined) i.title = title.trim();
      if (description !== undefined) i.description = description ?? null;
      if (category !== undefined) i.category = category ?? null;
      if (tags !== undefined) i.tags = tags ?? null;
      if (source_url !== undefined) i.source_url = source_url ?? null;

      await item.save();

      return res.json(item);
    } catch (err) {
      console.error("Error updating inspiration item:", err);
      return res
        .status(500)
        .json({ message: "Błąd aktualizacji inspiracji" });
    }
  }
);

/**
 * DELETE /inspirations/items/:itemId
 * Usuwa inspirację
 */
router.delete(
  "/items/:itemId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { itemId } = req.params;

      const item = await InspirationItem.findByPk(itemId);
      if (!item) {
        return res
          .status(404)
          .json({ message: "Inspiracja nie została znaleziona" });
      }

      await item.destroy();
      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting inspiration item:", err);
      return res
        .status(500)
        .json({ message: "Błąd usuwania inspiracji" });
    }
  }
);

// =====================================
// UPLOAD OBRAZKA DLA INSPIRACJI
// =====================================

/**
 * POST /inspirations/items/:itemId/upload
 * Upload pliku graficznego dla inspiracji
 */
router.post(
  "/items/:itemId/upload",
  authMiddleware,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { itemId } = req.params;

      const item = await InspirationItem.findByPk(itemId);
      if (!item) {
        // jeśli plik został zapisany, a inspiracji nie ma – można ewentualnie usunąć plik
        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }
        return res
          .status(404)
          .json({ message: "Inspiracja nie została znaleziona" });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Brak pliku w żądaniu" });
      }

      // Ścieżka jaką zwrócimy do frontu (pod warunkiem, że udostępniasz /uploads jako statyczne)
      const relativePath = `/uploads/inspirations/${path.basename(
        req.file.path
      )}`;

      const i = item as any;
      i.image_url = relativePath;
      await item.save();

      return res.json(item);
    } catch (err) {
      console.error("Error uploading inspiration image:", err);
      return res
        .status(500)
        .json({ message: "Błąd uploadu pliku inspiracji" });
    }
  }
);

export default router;
