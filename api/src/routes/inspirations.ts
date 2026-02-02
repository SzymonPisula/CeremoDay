// CeremoDay/api/src/routes/inspirations.ts
import { Router, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

import InspirationBoard from "../models/InspirationBoard";
import InspirationItem from "../models/InspirationItem";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { requireActiveMember } from "../middleware/requireActiveMember";
import { requireActiveMemberForModel } from "../middleware/requireActiveMemberForModel";
import { validateBody } from "../middleware/validate";

import {
  inspirationBoardCreateSchema,
  inspirationBoardUpdateSchema,
  inspirationItemCreateSchema,
  inspirationItemUpdateSchema,
} from "../validation";
import { paramString } from "../utils/http";

const router = Router();

// 🔹 Upewniamy się, że katalog na uploady istnieje
const uploadsDir = path.join(__dirname, "..", "..", "uploads", "inspirations");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
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

// ======================================================
// Helpers: resolve event_id for InspirationItem via board
// ======================================================
async function resolveEventIdFromItem(it: any): Promise<string | null> {
  // jeśli kiedyś dodasz event_id do itemu, to nadal zadziała
  if (typeof it?.event_id === "string" && it.event_id.trim()) return it.event_id.trim();

  const boardId = typeof it?.board_id === "string" ? it.board_id.trim() : "";
  if (!boardId) return null;

  const board = await InspirationBoard.findByPk(boardId);
  const b: any = board as any;

  if (typeof b?.event_id === "string" && b.event_id.trim()) return b.event_id.trim();
  return null;
}

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
  requireActiveMember("eventId"),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = paramString(req, "eventId");

      const boards = await InspirationBoard.findAll({
        where: { event_id: eventId },
        order: [["created_at", "ASC"]],
      });

      return res.json(boards);
    } catch (err) {
      console.error("Error fetching inspiration boards:", err);
      return res.status(500).json({ message: "Błąd pobierania tablic inspiracji" });
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
  requireActiveMember("eventId"),
  validateBody(inspirationBoardCreateSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = paramString(req, "eventId");
      const { name, description, color, emoji } = req.body as {
        name: string;
        description?: string;
        color?: string;
        emoji?: string;
      };

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
      return res.status(500).json({ message: "Błąd tworzenia tablicy inspiracji" });
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
  // ✅ POPRAWKA: tu musi być InspirationBoard + boardId
  requireActiveMemberForModel({
    model: InspirationBoard as any,
    idParam: "boardId",
    label: "tablica inspiracji",
  }),
  validateBody(inspirationBoardUpdateSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const boardId = paramString(req, "boardId");
      const { name, description, color, emoji } = req.body as {
        name?: string;
        description?: string;
        color?: string;
        emoji?: string;
      };

      const board = await InspirationBoard.findByPk(boardId);
      if (!board) {
        return res.status(404).json({ message: "Tablica inspiracji nie została znaleziona" });
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
      return res.status(500).json({ message: "Błąd aktualizacji tablicy inspiracji" });
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
  requireActiveMemberForModel({
    model: InspirationBoard as any,
    idParam: "boardId",
    label: "tablica inspiracji",
  }),
  async (req: AuthRequest, res: Response) => {
    try {
      const boardId = paramString(req, "boardId");

      const board = await InspirationBoard.findByPk(boardId);
      if (!board) {
        return res.status(404).json({ message: "Tablica inspiracji nie została znaleziona" });
      }

      // usuwamy powiązane inspiracje
      await InspirationItem.destroy({
        where: { board_id: boardId },
      });

      await board.destroy();
      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting inspiration board:", err);
      return res.status(500).json({ message: "Błąd usuwania tablicy inspiracji" });
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
  requireActiveMemberForModel({
    model: InspirationBoard as any,
    idParam: "boardId",
    label: "tablica inspiracji",
  }),
  async (req: AuthRequest, res: Response) => {
    try {
      const boardId = paramString(req, "boardId");

      const items = await InspirationItem.findAll({
        where: { board_id: boardId },
        order: [["created_at", "ASC"]],
      });

      return res.json(items);
    } catch (err) {
      console.error("Error fetching inspiration items:", err);
      return res.status(500).json({ message: "Błąd pobierania inspiracji" });
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
  requireActiveMemberForModel({
    model: InspirationBoard as any,
    idParam: "boardId",
    label: "tablica inspiracji",
  }),
  validateBody(inspirationItemCreateSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const boardId = paramString(req, "boardId");
      const { title, description, category, tags, source_url } = req.body as {
        title: string;
        description?: string;
        category?: "DEKORACJE" | "KWIATY" | "STROJE" | "PAPETERIA" | "INNE";
        tags?: string;
        source_url?: string;
      };

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
      return res.status(500).json({ message: "Błąd tworzenia inspiracji" });
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
  // ✅ POPRAWKA: event_id wyciągamy przez board_id
  requireActiveMemberForModel({
    model: InspirationItem as any,
    idParam: "itemId",
    label: "inspiracja",
    resolveEventId: resolveEventIdFromItem,
  }),
  validateBody(inspirationItemUpdateSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const itemId = paramString(req, "itemId");
      const { title, description, category, tags, source_url } = req.body as {
        title?: string;
        description?: string;
        category?: "DEKORACJE" | "KWIATY" | "STROJE" | "PAPETERIA" | "INNE";
        tags?: string;
        source_url?: string;
      };

      const item = await InspirationItem.findByPk(itemId);
      if (!item) {
        return res.status(404).json({ message: "Inspiracja nie została znaleziona" });
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
      return res.status(500).json({ message: "Błąd aktualizacji inspiracji" });
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
  // ✅ POPRAWKA: event_id wyciągamy przez board_id
  requireActiveMemberForModel({
    model: InspirationItem as any,
    idParam: "itemId",
    label: "inspiracja",
    resolveEventId: resolveEventIdFromItem,
  }),
  async (req: AuthRequest, res: Response) => {
    try {
      const itemId = paramString(req, "itemId");

      const item = await InspirationItem.findByPk(itemId);
      if (!item) {
        return res.status(404).json({ message: "Inspiracja nie została znaleziona" });
      }

      await item.destroy();
      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting inspiration item:", err);
      return res.status(500).json({ message: "Błąd usuwania inspiracji" });
    }
  }
);

// =====================================
// UPLOAD OBRAZKA DLA INSPIRACJI
// =====================================

// ✅ Middleware: wyciągamy eventId przez: item -> board -> event_id
async function resolveEventFromItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const itemId = paramString(req, "itemId");

    const item = await InspirationItem.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ message: "Inspiracja nie została znaleziona" });
    }

    const i = item as any;
    const boardId = i.board_id;

    if (!boardId) {
      return res.status(500).json({ message: "Błąd serwera: inspiracja nie ma poprawnego board_id." });
    }

    const board = await InspirationBoard.findByPk(boardId);
    if (!board) {
      return res.status(500).json({ message: "Błąd serwera: nie znaleziono tablicy inspiracji dla tej inspiracji." });
    }

    const b = board as any;
    const eventId = b.event_id;

    if (!eventId) {
      return res.status(500).json({ message: "Błąd serwera: inspiracja nie ma poprawnego event_id." });
    }

    // ustawiamy eventId tak, żeby requireActiveMember("eventId") zadziałał
    (req.params as any).eventId = eventId;

    // wrzucamy item/board do locals żeby nie robić drugi raz query
    (res.locals as any).inspirationItem = item;
    (res.locals as any).inspirationBoard = board;

    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /inspirations/items/:itemId/upload
 * Upload pliku graficznego dla inspiracji
 */
router.post(
  "/items/:itemId/upload",
  authMiddleware,
  // ✅ obejście: event_id bierzemy z boarda
  resolveEventFromItem,
  requireActiveMember("eventId"),
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const item = (res.locals as any).inspirationItem as any;

      if (!req.file) {
        return res.status(400).json({ message: "Brak pliku w żądaniu" });
      }

      // Ścieżka jaką zwrócimy do frontu (pod warunkiem, że udostępniasz /uploads jako statyczne)
      const relativePath = `/uploads/inspirations/${path.basename(req.file.path)}`;

      item.image_url = relativePath;
      await item.save();

      return res.json(item);
    } catch (err) {
      console.error("Error uploading inspiration image:", err);
      return res.status(500).json({ message: "Błąd uploadu pliku inspiracji" });
    }
  }
);

export default router;
