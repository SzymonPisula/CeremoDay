// CeremoDay/api/src/routes/tasks.ts
import { Router, Response } from "express";
import Task from "../models/Task";
import { AuthRequest, authMiddleware } from "../middleware/auth";

const router = Router();

/**
 * GET /tasks/event/:eventId
 * Zwraca wszystkie zadania dla danego wydarzenia
 */
router.get(
  "/event/:eventId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

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
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const {
        title,
        description,
        status,
        category,
        due_date,
      } = req.body as {
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "done";
        category?:
          | "FORMALNOSCI"
          | "ORGANIZACJA"
          | "USLUGI"
          | "DEKORACJE"
          | "LOGISTYKA"
          | "DZIEN_SLUBU";
        due_date?: string | null;
      };

      if (!title || typeof title !== "string") {
        return res
          .status(400)
          .json({ message: "Tytuł zadania jest wymagany" });
      }

      const task = await Task.create({
        event_id: eventId,
        title: title.trim(),
        description: description ?? null,
        status: status ?? "pending",
        category: category ?? null,
        due_date: due_date ? new Date(due_date) : null,
        auto_generated: false,
        generated_from: "manual",
      } as any);

      return res.status(201).json(task);
    } catch (err) {
      console.error("Error creating task:", err);
      return res
        .status(500)
        .json({ message: "Błąd tworzenia zadania" });
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
        description?: string;
        status?: "pending" | "in_progress" | "done";
        category?:
          | "FORMALNOSCI"
          | "ORGANIZACJA"
          | "USLUGI"
          | "DEKORACJE"
          | "LOGISTYKA"
          | "DZIEN_SLUBU";
        due_date?: string | null;
      };

      const task = await Task.findByPk(taskId);
      if (!task) {
        return res
          .status(404)
          .json({ message: "Zadanie nie zostało znalezione" });
      }

      const t = task as any;

      if (title !== undefined) t.title = title.trim();
      if (description !== undefined) t.description = description;
      if (status !== undefined) t.status = status;
      if (category !== undefined) t.category = category ?? null;

      if (due_date !== undefined) {
        t.due_date = due_date ? new Date(due_date) : null;
      }

      await task.save();
      return res.json(task);
    } catch (err) {
      console.error("Error updating task:", err);
      return res
        .status(500)
        .json({ message: "Błąd aktualizacji zadania" });
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
  async (req: AuthRequest, res: Response) => {
    try {
      const { taskId } = req.params;

      const task = await Task.findByPk(taskId);
      if (!task) {
        return res
          .status(404)
          .json({ message: "Zadanie nie zostało znalezione" });
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
