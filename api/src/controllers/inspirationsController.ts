import { Request, Response } from "express";
import { InspirationsBoard } from "../models/InspirationBoard";
import { InspirationsItem } from "../models/InspirationItem";
import { generateThumbnail } from "../helpers/generateThumbnail";

// === BOARDS ===
export const getBoards = async (req: Request, res: Response) => {
  try {
    const boards = await InspirationsBoard.findAll({
      where: { event_id: req.params.eventId },
      include: [{ model: InspirationsItem, as: "items", order: [["position", "ASC"]] }],
    });

    res.json(boards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const createBoard = async (req: Request, res: Response) => {
  try {
    const board = await InspirationsBoard.create({
      event_id: req.params.eventId,
      name: req.body.name,
      description: req.body.description || null,
    });

    res.json(board);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateBoard = async (req: Request, res: Response) => {
  try {
    const board = await InspirationsBoard.findByPk(req.params.id);
    if (!board) return res.status(404).json({ error: "Not found" });

    await board.update(req.body);
    res.json(board);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteBoard = async (req: Request, res: Response) => {
  try {
    await InspirationsItem.destroy({ where: { board_id: req.params.id } });
    await InspirationsBoard.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// === ITEMS ===
export const createItem = async (req: Request, res: Response) => {
  try {
    let file_url = req.body.file_url || null;
    let thumb_url = null;

    if (req.file) {
      const t = await generateThumbnail(req.file.path);
      file_url = t.full;
      thumb_url = t.thumb;
    }

    const item = await InspirationsItem.create({
      board_id: req.params.boardId,
      event_id: req.params.eventId,
      file_url,
      thumb_url,
      note: req.body.note || null,
      source_type: req.file ? "upload" : "link",
      position: 999,
    });

    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const item = await InspirationsItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });

    let file_url = item.file_url;
    let thumb_url = item.thumb_url;

    if (req.file) {
      const t = await generateThumbnail(req.file.path);
      file_url = t.full;
      thumb_url = t.thumb;
    }

    await item.update({
      file_url,
      thumb_url,
      note: req.body.note,
      position: req.body.position ?? item.position,
    });

    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    await InspirationsItem.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
