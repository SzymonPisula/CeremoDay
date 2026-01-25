// CeremoDay/api/src/controllers/inspirationsController.ts
import { Request, Response } from "express";
import { InspirationBoard } from "../models/InspirationBoard";
import { InspirationItem } from "../models/InspirationItem";
import { generateThumbnail } from "../helpers/generateThumbnail";

/**
 * Bezpieczne mapowanie pól:
 * - w różnych snapshotach projektu InspirationItem mógł mieć inne nazwy kolumn
 * - TS sypał błędami gdy controller próbował użyć nieistniejących pól
 *
 * Tu wykrywamy dostępne kolumny na modelu i ustawiamy tylko te, które istnieją.
 */

type ItemAttributesMap = Record<string, unknown>;

function getItemAttributes(): Record<string, unknown> {
  // Sequelize v6: Model.getAttributes() istnieje statycznie
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attrs = (InspirationItem as any).getAttributes?.() as
    | Record<string, unknown>
    | undefined;
  return attrs ?? {};
}

function hasAttr(attrName: string) {
  const attrs = getItemAttributes();
  return Object.prototype.hasOwnProperty.call(attrs, attrName);
}

function firstExistingAttr(candidates: string[]): string | null {
  for (const c of candidates) {
    if (hasAttr(c)) return c;
  }
  return null;
}

const COL = {
  file: () => firstExistingAttr(["file_url", "image_url", "url", "src"]),
  thumb: () =>
    firstExistingAttr(["thumb_url", "thumbnail_url", "thumb", "preview_url"]),
  note: () => firstExistingAttr(["note", "notes", "description"]),
  sourceType: () => firstExistingAttr(["source_type", "source", "type"]),
  position: () => firstExistingAttr(["position", "sort_order", "order", "idx"]),
  eventId: () => firstExistingAttr(["event_id", "eventId"]),
};

// === BOARDS ===
export const getBoards = async (req: Request, res: Response) => {
  try {
    const positionCol = COL.position();

    const boards = await InspirationBoard.findAll({
      where: { event_id: req.params.eventId },
      include: [{ model: InspirationItem, as: "items" }],
      order: positionCol
        ? [[{ model: InspirationItem, as: "items" }, positionCol as string, "ASC"]]
        : hasAttr("created_at")
          ? [[{ model: InspirationItem, as: "items" }, "created_at", "ASC"]]
          : hasAttr("updated_at")
            ? [[{ model: InspirationItem, as: "items" }, "updated_at", "ASC"]]
            : undefined,
    });

    res.json(boards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const createBoard = async (req: Request, res: Response) => {
  try {
    const board = await InspirationBoard.create({
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
    const board = await InspirationBoard.findByPk(req.params.id);
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
    await InspirationItem.destroy({ where: { board_id: req.params.id } });
    await InspirationBoard.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// === ITEMS ===
export const createItem = async (req: Request, res: Response) => {
  try {
    const fileCol = COL.file();
    const thumbCol = COL.thumb();
    const noteCol = COL.note();
    const sourceTypeCol = COL.sourceType();
    const positionCol = COL.position();
    const eventIdCol = COL.eventId();

    // wartości, które chcemy ustawić
    let fileValue: string | null = req.body.file_url || req.body.image_url || req.body.url || null;
    let thumbValue: string | null = null;

    if (req.file) {
      const t = await generateThumbnail(req.file.path);
      fileValue = t.full;
      thumbValue = t.thumb;
    }

    const payload: ItemAttributesMap = {
      board_id: req.params.boardId,
    };

    // event_id tylko jeśli model to wspiera
    if (eventIdCol) payload[eventIdCol] = req.params.eventId;

    if (fileCol) payload[fileCol] = fileValue;
    if (thumbCol) payload[thumbCol] = thumbValue;

    if (noteCol) payload[noteCol] = req.body.note || req.body.notes || req.body.description || null;

    if (sourceTypeCol) payload[sourceTypeCol] = req.file ? "upload" : "link";

    // pozycja tylko jeśli model ma odpowiednią kolumnę
    if (positionCol) payload[positionCol] = 999;

    // TS: create wymaga konkretnych atrybutów z modelu — tu payload jest dynamiczny,
    // więc rzutujemy bezpiecznie do "unknown" a dalej do oczekiwanego typu.
    // Dzięki temu nie sypie błędami gdy kolumny nie istnieją w danym snapshotcie.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await (InspirationItem as any).create(payload);

    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = (await (InspirationItem as any).findByPk(req.params.id)) as any;
    if (!item) return res.status(404).json({ error: "Not found" });

    const fileCol = COL.file();
    const thumbCol = COL.thumb();
    const noteCol = COL.note();
    const positionCol = COL.position();

    // bierzemy aktualne wartości (jeśli kolumny istnieją)
    let fileValue: string | null =
      (fileCol ? (item[fileCol] as string | null) : null) ?? null;
    let thumbValue: string | null =
      (thumbCol ? (item[thumbCol] as string | null) : null) ?? null;

    if (req.file) {
      const t = await generateThumbnail(req.file.path);
      fileValue = t.full;
      thumbValue = t.thumb;
    }

    const updatePayload: ItemAttributesMap = {};

    if (fileCol) updatePayload[fileCol] = fileValue;
    if (thumbCol) updatePayload[thumbCol] = thumbValue;

    if (noteCol) {
      // preferujemy "note" z body, ale akceptujemy też description/notes
      updatePayload[noteCol] =
        req.body.note ?? req.body.notes ?? req.body.description ?? null;
    }

    if (positionCol) {
      // jeśli ktoś przesyła pozycję, ustawiamy; jeśli nie – zostawiamy
      if (req.body.position !== undefined && req.body.position !== null) {
        updatePayload[positionCol] = req.body.position;
      }
    }

    await item.update(updatePayload);
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    await InspirationItem.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
