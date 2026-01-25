import { Router, Response } from "express";
import multer from "multer";

import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { ApiError } from "../utils/apiError";
import { documentCreateSchema, documentUpdateSchema, documentGenerateDefaultSchema } from "../validation";
import { requireActiveMember } from "../middleware/requireActiveMember";
import { requireActiveMemberForModel } from "../middleware/requireActiveMemberForModel";
import { Document, type DocumentStatus } from "../models/Document";
import { DocumentFile, StorageLocation } from "../models/DocumentFile";
import { storageService } from "../services/storageService";
import { getTemplatesForCeremony, CeremonyType } from "../config/documentTemplates";

const router = Router();
const upload = multer();

const allowedNextStatus: Record<DocumentStatus, DocumentStatus[]> = {
  todo: ["in_progress"],
  in_progress: ["done"],
  done: [],
};

function normalizeStatus(v: unknown): DocumentStatus | null {
  if (v === "todo" || v === "in_progress" || v === "done") return v;
  if (v === "pending") return "todo";
  return null;
}

function normalizeDocumentType(raw: unknown): "civil" | "concordat" | "custom" {
  const s = typeof raw === "string" ? raw.toLowerCase().trim() : "custom";

  // wsteczna kompatybilność:
  // - "church" w starych wersjach -> teraz "concordat"
  if (s === "church") return "concordat";

  if (s === "civil") return "civil";
  if (s === "concordat") return "concordat";
  return "custom";
}

/**
 * POST /documents/event/:eventId/generate-default
 * Generuje domyślne dokumenty wg templates (civil/concordat)
 */
router.post(
  "/event/:eventId/generate-default",
  authMiddleware,
  requireActiveMember("eventId"),
  validateBody(documentGenerateDefaultSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const { ceremony_type, include_extras } = req.body as { ceremony_type: CeremonyType; include_extras?: boolean };

      // UWAGA: nie blokujemy generowania po samej nazwie,
      // bo część nazw jest wspólna dla civil i concordat.
      // Klucz = `${type}::${name}`
      const existingDocs = await Document.findAll({ where: { event_id: eventId } });
      const existingKeys = new Set(
        existingDocs.map((d: any) => {
          const t = String(d.type ?? "").toLowerCase();
          const n = String(d.name ?? "").toLowerCase();
          return `${t}::${n}`;
        })
      );

      const templates = getTemplatesForCeremony(ceremony_type, include_extras ?? true);

      const toCreate = templates.filter((tpl) => {
        const key = `${ceremony_type}::${tpl.name.toLowerCase()}`;
        return !existingKeys.has(key);
      });

      const created = await Promise.all(
        toCreate.map((tpl) => {
          // KLUCZ FIX: type oznacza rodzaj ceremonii (civil|concordat),
          // a nie "czy z kościoła". To rozróżnia category.
          const docType: "civil" | "concordat" = ceremony_type;

          return Document.create(
            {
              event_id: eventId,
              name: tpl.name,
              description: tpl.description,
              category: (tpl.category as any) ?? null,
              holder: (tpl.holder as any) ?? null,

              type: docType,
              status: "todo",
              is_system: true,
              is_pinned: !tpl.is_extra,
            } as any
          );
        })
      );

      return res.status(201).json(created);
    } catch (err) {
      console.error("Error generating default documents:", err);
      return res
        .status(500)
        .json({ message: "Błąd generowania domyślnych dokumentów" });
    }
  }
);

/**
 * GET /documents/event/:eventId
 */
router.get(
  "/event/:eventId",
  authMiddleware,
  requireActiveMember("eventId"),
  async (req: AuthRequest, res: Response) => {

    try {
      const { eventId } = req.params;

      // Bezpieczne sortowanie (nie uzależniamy się od created_at vs createdAt)
      const docs = await Document.findAll({
        where: { event_id: eventId },
        order: [
          ["is_pinned", "DESC"],
          ["is_system", "DESC"],
          ["name", "ASC"],
        ],
      });

      return res.json(docs);
    } catch (err) {
      console.error("Error fetching documents:", err);
      return res.status(500).json({ message: "Błąd pobierania dokumentów" });
    }
  }
);

/**
 * POST /documents/event/:eventId
 * Tworzenie własnego dokumentu
 */
router.post(
  "/event/:eventId",
  authMiddleware,
  requireActiveMember("eventId"),
  validateBody(documentCreateSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const {
  name,
  description,
  category,
  holder,
  due_date,
  valid_until,
  is_pinned,
  type,
} = req.body as {
  name: string;
  description?: string;
  category?: string;
  holder?: string;
  due_date?: string | null;
  valid_until?: string | null;
  is_pinned?: boolean;
  type?: unknown;
};


      // Typ dla dokumentu:
      // - civil / concordat / custom
      // (legacy "church" mapujemy na "concordat")
      const nextType = normalizeDocumentType(type);
      const safeName = name.trim();

      const doc = await Document.create({
        event_id: eventId,
        name: name.trim(),
        description: typeof description === "string" ? description : null,

        // te pola mogą zostać w modelu — UI możesz już nie wysyłać
        category: typeof category === "string" ? category : null,
        holder: typeof holder === "string" ? holder : null,

        type: nextType,
        status: "todo",
        is_system: false,

        // jeśli UI nie wysyła -> domyślnie false (albo zmień na true jeśli chcesz)
        is_pinned: typeof is_pinned === "boolean" ? is_pinned : true,

        due_date: due_date ? new Date(String(due_date)) : null,
        valid_until: valid_until ? new Date(String(valid_until)) : null,
      });

      return res.status(201).json(doc);
    } catch (err) {
      console.error("Error creating document:", err);
      return res.status(500).json({ message: "Błąd tworzenia dokumentu" });
    }
  }
);

/**
 * PUT /documents/:documentId
 * Update:
 * - system docs: only status forward + pin + dates
 * - manual docs: full update + status forward + pin + dates
 */
router.put(
  "/:documentId",
  authMiddleware,
  requireActiveMemberForModel({ model: Document as any, idParam: "documentId", label: "dokument" }),
  validateBody(documentUpdateSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { documentId } = req.params;

      const doc = await Document.findByPk(documentId);
      if (!doc) {
        return res.status(404).json({ message: "Dokument nie znaleziony" });
      }

      const d = doc as any;

      const allowedNext: Record<
        "todo" | "in_progress" | "done",
        Array<"todo" | "in_progress" | "done">
      > = {
        todo: ["in_progress"],
        in_progress: ["done"],
        done: [],
      };

      const incoming = req.body as Record<string, unknown>;

      const name = incoming.name;
      const description = incoming.description;
      const category = incoming.category;
      const holder = incoming.holder;
      const status = incoming.status;
      const due_date = incoming.due_date;
      const valid_until = incoming.valid_until;
      const is_pinned = incoming.is_pinned;

      // Fields update only for manual docs
      if (!d.is_system) {
        if (name !== undefined) d.name = String(name);
        if (description !== undefined) d.description = description ? String(description) : null;
        if (category !== undefined) d.category = category ? String(category) : null;
        if (holder !== undefined) d.holder = holder ? String(holder) : null;
      }

      // Pin allowed always
      if (typeof is_pinned === "boolean") {
        d.is_pinned = is_pinned;
      }

      // Dates allowed always
      if (due_date !== undefined) d.due_date = due_date ? new Date(String(due_date)) : null;
      if (valid_until !== undefined) d.valid_until = valid_until ? new Date(String(valid_until)) : null;

      // Status: only forward
      if (status !== undefined) {
        const next = String(status) as "todo" | "in_progress" | "done";

        const currentRaw = String(d.status ?? "todo");
        const current = (currentRaw === "pending" ? "todo" : currentRaw) as
          | "todo"
          | "in_progress"
          | "done";

        if (next !== current && allowedNext[current]?.includes(next)) {
          // DONE wymaga min. 1 pliku przypiętego do dokumentu
          if (next === "done") {
            const filesCount = await DocumentFile.count({ where: { document_id: documentId } });
            if (filesCount < 1) {
              throw new ApiError(400, "VALIDATION_ERROR", "Popraw pola w formularzu.", { status: "Aby oznaczyć dokument jako ukończony, dodaj przynajmniej jeden plik." });
            }
          }

          d.status = next;
        }
      }

      await doc.save();
      return res.json(doc);
    } catch (err) {
      console.error("Error updating document:", err);
      return res.status(500).json({ message: "Błąd aktualizacji dokumentu" });
    }
  }
);

router.delete(
  "/:documentId",
  authMiddleware,
  requireActiveMemberForModel({ model: Document as any, idParam: "documentId", label: "dokument" }),
  async (req: AuthRequest, res: Response) => {
    try {
      const { documentId } = req.params;
      const doc = await Document.findByPk(documentId);

      if (!doc) return res.status(404).json({ message: "Dokument nie znaleziony" });
      if (doc.is_system) throw new ApiError(400, "VALIDATION_ERROR", "Popraw pola w formularzu.", { _global: "Nie można usuwać dokumentów systemowych" });

      await doc.destroy();
      return res.json({ success: true });
    } catch (err) {
      console.error("Error deleting document:", err);
      return res.status(500).json({ message: "Błąd usuwania dokumentu" });
    }
  }
);

router.get(
  "/:documentId/files",
  authMiddleware,
  requireActiveMemberForModel({ model: Document as any, idParam: "documentId", label: "dokument" }),
  async (req: AuthRequest, res: Response) => {
    try {
      const { documentId } = req.params;

      const files = await DocumentFile.findAll({
        where: { document_id: documentId },
        order: [["created_at", "ASC"]],
      });

      return res.json(files);
    } catch (err) {
      console.error("Error fetching document files:", err);
      return res.status(500).json({ message: "Błąd pobierania plików" });
    }
  }
);

// upload: server (multipart) albo local (JSON metadata)
router.post(
  "/:documentId/files",
  authMiddleware,
  requireActiveMemberForModel({ model: Document as any, idParam: "documentId", label: "dokument" }),
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { documentId } = req.params;
      const userId = req.userId;

      if (!userId) return res.status(401).json({ message: "Nieautoryzowany" });

      const document = await Document.findByPk(documentId);
      if (!document) return res.status(404).json({ message: "Dokument nie znaleziony" });

      const storage_location = (req.body?.storage_location ?? "server") as StorageLocation;

      // LOCAL: backend dostaje tylko metadane (bez pliku)
      if (storage_location === "local") {
        const original_name = String(req.body?.original_name ?? "");
        const mime_type = String(req.body?.mime_type ?? "application/octet-stream");
        const size = Number(req.body?.size ?? 0);

        if (!original_name) {
          throw new ApiError(400, "VALIDATION_ERROR", "Popraw pola w formularzu.", { original_name: "Brak original_name dla pliku lokalnego" });
        }

        const created = await DocumentFile.create({
          event_id: document.event_id,
          document_id: document.id,
          user_id: userId,
          storage_location: "local",
          storage_key: null,
          original_name,
          mime_type,
          size: Number.isFinite(size) ? size : 0,
          person: null,
        });

        return res.status(201).json(created);
      }

      // SERVER: multipart file required
      const file = req.file;
      if (!file) throw new ApiError(400, "VALIDATION_ERROR", "Popraw pola w formularzu.", { file: "Brak pliku w żądaniu" });

      const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const storageKey = `events/${document.event_id}/documents/${documentId}/${Date.now()}-${safeName}`;

      await storageService.saveFile(file.buffer, storageKey);

      const created = await DocumentFile.create({
        event_id: document.event_id,
        document_id: document.id,
        user_id: userId,
        storage_location: "server",
        storage_key: storageKey,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        person: null,
      });

      return res.status(201).json(created);
    } catch (err) {
      console.error("Error uploading document file:", err);
      return res.status(500).json({ message: "Błąd serwera podczas uploadu pliku" });
    }
  }
);

router.delete(
  "/files/:fileId",
  authMiddleware,
  requireActiveMemberForModel({ model: DocumentFile as any, idParam: "fileId", label: "plik dokumentu" }),
  async (req: AuthRequest, res: Response) => {
    try {
      const { fileId } = req.params;
      const file = await DocumentFile.findByPk(fileId);

      if (!file) return res.status(404).json({ message: "Plik nie znaleziony" });

      if (file.storage_location === "server" && file.storage_key) {
        await storageService.deleteFile(file.storage_key);
      }

      await file.destroy();
      return res.json({ success: true });
    } catch (err) {
      console.error("Error deleting document file:", err);
      return res.status(500).json({ message: "Błąd serwera podczas usuwania pliku" });
    }
  }
);

router.get(
  "/files/:fileId/download",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { fileId } = req.params;
      const file = await DocumentFile.findByPk(fileId);

      if (!file) return res.status(404).json({ message: "Plik nie znaleziony" });

      if (file.storage_location === "local") {
        throw new ApiError(400, "VALIDATION_ERROR", "Popraw pola w formularzu.", { _global: "Ten plik jest przechowywany tylko lokalnie na urządzeniu użytkownika" });
      }

      if (!file.storage_key) {
        return res.status(500).json({ message: "Brak storage_key dla pliku" });
      }

      const buffer = await storageService.readFile(file.storage_key);

      res.setHeader("Content-Type", file.mime_type);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(file.original_name)}"`
      );
      return res.send(buffer);
    } catch (err) {
      console.error("Error downloading document file:", err);
      return res.status(500).json({ message: "Błąd serwera podczas pobierania pliku" });
    }
  }
);

export default router;
