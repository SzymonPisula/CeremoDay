// CeremoDay/api/src/routes/tasks.ts
import { Router, Response } from "express";
import { Op } from "sequelize";
import Task from "../models/Task";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { taskCreateSchema, taskUpdateSchema } from "../validation/schemas";
import { requireActiveMember } from "../middleware/requireActiveMember";
import { requireActiveMemberForModel } from "../middleware/requireActiveMemberForModel";

const router = Router();

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return undefined;
}

function requireId(res: Response, value: unknown, label: string): string | null {
  const id = firstString(value);
  if (!id) {
    res.status(400).json({ message: `Brak ${label}` });
    return null;
  }
  return id;
}


/**
 * GET /tasks/event/:eventId
 * Zwraca wszystkie zadania dla danego wydarzenia
 */
router.get(
  "/event/:eventId",
  authMiddleware,
  requireActiveMember("eventId"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      // --- UX/stabilność: zaległe zadania (due_date < dziś, a status != done)
      // Jeśli user ma zadania ustawione wstecz względem daty ślubu albo „przegapił termin”,
      // backend automatycznie przenosi je z pending -> in_progress.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await Task.update(
        { status: "in_progress" } as any,
        {
          where: {
            event_id: eventId,
            status: "pending",
            due_date: { [Op.ne]: null, [Op.lt]: today },
          },
        }
      );

      const tasks = await Task.findAll({
        where: { event_id: eventId },
        order: [
          ["due_date", "ASC"],
          ["created_at", "ASC"],
        ],
      });

      return res.json(tasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      return res
        .status(500)
        .json({ message: "Błąd pobierania zadań" });
    }
  }
);

/**
 * POST /tasks/event/:eventId
 * Tworzy nowe zadanie dla danego wydarzenia
 */
router.post(
  "/event/:eventId",
  authMiddleware,
  requireActiveMember("eventId"),
  validateBody(taskCreateSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const { title, description, status, category, due_date } = req.body as {
        title: string;
        description: string | null;
        status: "pending" | "in_progress" | "done";
        category: any;
        due_date: string | null;
      };

      // ✅ Normalizacja opisu:
      // - undefined -> null
      // - null -> null
      // - string -> trim, jeśli puste po trim => null
      let normalizedDescription: string | null = null;
      if (typeof description === "string") {
        const trimmed = description.trim();
        normalizedDescription = trimmed.length ? trimmed : null;
      }

      // zaległe od razu idzie na in_progress
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const parsedDue = due_date ? new Date(due_date) : null;
      const shouldAutoInProgress = !!parsedDue && parsedDue < today;

      const task = await Task.create({
        event_id: eventId,
        title: title.trim(),
        description: normalizedDescription, // ✅
        status: shouldAutoInProgress ? "in_progress" : (status ?? "pending"),
        category: category ?? null,
        due_date: parsedDue,
        auto_generated: false,
        generated_from: "manual",
        source: "manual",            // ✅ MASZ to w modelu jako NOT NULL
        linked_document_id: null,    // ✅ jw.
      } as any);

      return res.status(201).json(task);
    } catch (err) {
      console.error("Error creating task:", err);
      return res.status(500).json({ message: "Błąd tworzenia zadania" });
    }
  }
);

/**
 * PUT /tasks/:taskId
 * Aktualizuje wybrane pola zadania
 */
router.put(
  "/:taskId",
  authMiddleware,
  requireActiveMemberForModel({
    model: Task as any,
    idParam: "taskId",
    label: "zadanie",
  }),
  validateBody(taskUpdateSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { taskId } = req.params;

      const {
        title,
        description,
        status,
        category,
        due_date,
      } = req.body as {
        title?: string;
        description?: string | null;
        status?: "pending" | "in_progress" | "done";
        category?:
          | "FORMALNOSCI"
          | "ORGANIZACJA"
          | "USLUGI"
          | "DEKORACJE"
          | "LOGISTYKA"
          | "DZIEN_SLUBU"
          | null;
        due_date?: string | null;
      };

const id = requireId(res, req.params.taskId, "id zadania");
if (!id) return;

const task = await Task.findByPk(id);
if (!task) {
  return res.status(404).json({ message: "Zadanie nie zostało znalezione" });
}




      const t = task as any;

      if (title !== undefined) t.title = title.trim();

      if (description !== undefined) {
        if (description === null) {
          t.description = null;
        } else if (typeof description === "string") {
          const trimmed = description.trim();
          t.description = trimmed.length ? trimmed : null;
        }
      }

      if (status !== undefined) t.status = status;
      if (category !== undefined) t.category = category ?? null;

      if (due_date !== undefined) {
        t.due_date = due_date ? new Date(due_date) : null;
      }

      // --- UX/stabilność: zaległy termin wymusza in_progress (o ile nie done) ---
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (t.status !== "done" && t.due_date && t.due_date < today) {
        t.status = "in_progress";
      }

      await task.save();
      return res.json(task);
    } catch (err) {
      console.error("Error updating task:", err);
      return res.status(500).json({ message: "Błąd aktualizacji zadania" });
    }
  }
);

/**
 * DELETE /tasks/:taskId
 * Usuwa zadanie (na razie fizycznie)
 */
router.delete(
  "/:taskId",
  authMiddleware,
  requireActiveMemberForModel({ model: Task as any, idParam: "taskId", label: "zadanie" }),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = requireId(res, req.params.taskId, "id zadania");
if (!id) return;

const task = await Task.findByPk(id);
if (!task) {
  return res.status(404).json({ message: "Zadanie nie zostało znalezione" });
}


      await task.destroy();
      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting task:", err);
      return res
        .status(500)
        .json({ message: "Błąd usuwania zadania" });
    }
  }
);

export default router;
