import express, { Request, Response } from "express";
import { Document } from "../models/Document";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const uploadDir = "uploads/documents";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".pdf", ".png", ".jpg", ".jpeg"].includes(ext)) {
      return cb(new Error("Tylko PDF, JPG, PNG"));
    }
    cb(null, true);
  },
});

// --- CRUD ---
router.get("/", async (req: Request, res: Response) => {
  const { event_id } = req.query;
  const docs = await Document.findAll({
    where: event_id ? { event_id } : {},
    order: [["due_date", "ASC"]],
  });
  res.json(docs);
});

router.post("/", async (req: Request, res: Response) => {
  const doc = await Document.create(req.body);
  res.json(doc);
});

router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await Document.update(req.body, { where: { id } });
  const updated = await Document.findByPk(id);
  res.json(updated);
});

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await Document.destroy({ where: { id } });
  res.json({ success: true });
});

// --- UPLOAD ---
router.post("/:id/upload", upload.single("file"), async (req: Request, res: Response) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) {
    return res.status(400).json({ error: "Nie przesłano pliku" });
  }

  const filePath = `/uploads/documents/${file.filename}`;

  await Document.update({ file_path: filePath }, { where: { id: req.params.id } });
  res.json({ filePath });
});

export default router;
