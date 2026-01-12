import { Router, Response } from "express";
import multer from "multer";

import { authMiddleware, AuthRequest } from "../middleware/auth";
import { Document } from "../models/Document";
import { DocumentFile, StorageLocation } from "../models/DocumentFile";
import { storageService } from "../services/storageService";
import { getTemplatesForCeremony, CeremonyType } from "../config/documentTemplates";
import { createDocument } from "../controllers/documentsController";

const router = Router();
const upload = multer(); // trzymamy pliki w pamięci, potem sami zapisujemy
/**
 * POST /documents/event/:eventId/generate-default
 * Generuje domyślną listę dokumentów dla wydarzenia
 * na podstawie typu ceremonii (cywilny / konkordatowy).
 */
router.post(
  "/event/:eventId/generate-default",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const { ceremony_type, include_extras } = req.body as {
        ceremony_type: CeremonyType;
        include_extras?: boolean;
      };

      if (ceremony_type !== "civil" && ceremony_type !== "concordat") {
        return res
          .status(400)
          .json({ message: "Nieprawidłowy typ ceremonii" });
      }

      // 🔎 pobieramy istniejące dokumenty, żeby nie dublować nazw
      const existingDocs = await Document.findAll({
        where: { event_id: eventId },
      });

      const existingNames = new Set(
        existingDocs.map((d: any) => (d.name as string).toLowerCase())
      );

      const templates = getTemplatesForCeremony(
        ceremony_type,
        include_extras ?? true
      );

      const toCreate = templates.filter(
        (tpl) => !existingNames.has(tpl.name.toLowerCase())
      );

      const created = await Promise.all(
        toCreate.map((tpl) => {
          // 🧠 mapowanie na pole "type" z modelu:
          // - dla ślubu cywilnego wszystkie = "civil"
          // - dla konkordatu: KOSCIOŁ -> "church", reszta -> "civil"
          let docType: "civil" | "church";

          if (ceremony_type === "civil") {
            docType = "civil";
          } else {
            // "concordat"
            docType = tpl.category === "KOSCIOŁ" ? "church" : "civil";
          }

          return Document.create(
            {
              event_id: eventId,
              name: tpl.name,
              description: tpl.description,
              type: docType,
              // status ma domyślnie "pending"
              // due_date, checked, notes, attachments zostają defaultowe
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

router.post("/documents/event/:eventId", createDocument);



/**
 * GET /documents/event/:eventId
 * Lista dokumentów dla wydarzenia
 */
router.get(
  "/event/:eventId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const docs = await Document.findAll({
        where: { event_id: eventId },
        order: [["created_at", "ASC"]],
      });

      // Możemy później dorzucić licznik plików przez osobny endpoint lub JOIN
      return res.json(docs);
    } catch (err) {
      console.error("Error fetching documents:", err);
      return res.status(500).json({ message: "Błąd pobierania dokumentów" });
    }
  }
);

/**
 * POST /documents/event/:eventId
 * Utworzenie nowego dokumentu ręcznego
 */
router.post(
  "/event/:eventId",
  authMiddleware,
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
      } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Nazwa dokumentu jest wymagana" });
      }

      const doc = await Document.create({
        event_id: eventId,
        name,
        description: description ?? "",
        category: category ?? null,
        holder: holder ?? null,
        due_date: due_date ? new Date(due_date) : null,
        valid_until: valid_until ? new Date(valid_until) : null,
        status: "pending",
        is_system: false,
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
 * Aktualizacja dokumentu (status, terminy, opis, itp.)
 */
router.put(
  "/:documentId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { documentId } = req.params;
      const {
        name,
        description,
        category,
        holder,
        status,
        due_date,
        valid_until,
      } = req.body;

      const doc = await Document.findByPk(documentId);
      if (!doc) {
        return res.status(404).json({ message: "Dokument nie znaleziony" });
      }

      // 👇 małe obejście typów – operujemy na doc jako na "any",
      // bo definicja TS modelu nie ma jeszcze wszystkich pól
      const d = doc as any;

      if (name !== undefined) d.name = name;
      if (description !== undefined) d.description = description;
      if (category !== undefined) d.category = category || null;
      if (holder !== undefined) d.holder = holder || null;
      if (status !== undefined) d.status = status;

      if (due_date !== undefined) {
        d.due_date = due_date ? new Date(due_date) : null;
      }
      if (valid_until !== undefined) {
        d.valid_until = valid_until ? new Date(valid_until) : null;
      }

      await doc.save();
      return res.json(doc);
    } catch (err) {
      console.error("Error updating document:", err);
      return res.status(500).json({ message: "Błąd aktualizacji dokumentu" });
    }
  }
);



/**
 * DELETE /documents/:documentId
 * Usunięcie dokumentu (tylko ręcznego – docelowo można blokować is_system=true)
 */
router.delete(
  "/:documentId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { documentId } = req.params;
      const doc = await Document.findByPk(documentId);
      if (!doc) {
        return res.status(404).json({ message: "Dokument nie znaleziony" });
      }

      // jeśli chcesz blokować usuwanie systemowych:
      // if (doc.is_system) {
      //   return res.status(400).json({ message: "Nie można usuwać dokumentów systemowych" });
      // }

      await doc.destroy();
      return res.json({ success: true });
    } catch (err) {
      console.error("Error deleting document:", err);
      return res.status(500).json({ message: "Błąd usuwania dokumentu" });
    }
  }
);

/**
 * GET /documents/:documentId/files
 * Lista plików dla dokumentu
 */
router.get(
  "/:documentId/files",
  authMiddleware,
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

/**
 * POST /documents/:documentId/files
 * Upload pliku dla dokumentu – hybryda:
 *  - storage_location = "server" | "local"
 */
router.post(
  "/:documentId/files",
  authMiddleware,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { documentId } = req.params;
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: "Nieautoryzowany" });
      }

      const document = await Document.findByPk(documentId);
      if (!document) {
        return res.status(404).json({ message: "Dokument nie znaleziony" });
      }

      const { storage_location = "server", person = null } = req.body as {
        storage_location?: StorageLocation;
        person?: "bride" | "groom" | "both" | null;
      };

      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "Brak pliku w żądaniu" });
      }

      let storageKey: string | null = null;

      if (storage_location === "server") {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        storageKey = `events/${document.event_id}/documents/${documentId}/${Date.now()}-${safeName}`;

        await storageService.saveFile(file.buffer, storageKey);
      }

      const created = await DocumentFile.create({
        event_id: document.event_id,
        document_id: document.id,
        user_id: userId,
        storage_location,
        storage_key: storageKey,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        person: person ?? null,
      });

      return res.status(201).json(created);
    } catch (err) {
      console.error("Error uploading document file:", err);
      return res
        .status(500)
        .json({ message: "Błąd serwera podczas uploadu pliku" });
    }
  }
);

/**
 * DELETE /documents/files/:fileId
 * Usuwanie załącznika
 */
router.delete(
  "/files/:fileId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { fileId } = req.params;
      const file = await DocumentFile.findByPk(fileId);
      if (!file) {
        return res.status(404).json({ message: "Plik nie znaleziony" });
      }

      if (file.storage_location === "server" && file.storage_key) {
        await storageService.deleteFile(file.storage_key);
      }

      await file.destroy();
      return res.json({ success: true });
    } catch (err) {
      console.error("Error deleting document file:", err);
      return res
        .status(500)
        .json({ message: "Błąd serwera podczas usuwania pliku" });
    }
  }
);

/**
 * GET /documents/files/:fileId/download
 * Pobieranie pliku – tylko dla storage_location="server"
 * (dla "local" zwracamy błąd, bo plik jest tylko na urządzeniu użytkownika)
 */
router.get(
  "/files/:fileId/download",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { fileId } = req.params;
      const file = await DocumentFile.findByPk(fileId);
      if (!file) {
        return res.status(404).json({ message: "Plik nie znaleziony" });
      }

      if (file.storage_location === "local") {
        return res.status(400).json({
          message:
            "Ten plik jest przechowywany tylko lokalnie na urządzeniu użytkownika",
        });
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
      return res
        .status(500)
        .json({ message: "Błąd serwera podczas pobierania pliku" });
    }
  }
);

export default router;
