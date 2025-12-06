// CeremoDay/api/src/routes/vendors.ts
import { Router, Response } from "express";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import Vendor from "../models/Vendor";

const router = Router();

/**
 * GET /vendors?event_id=...
 * Zwraca listę usługodawców przypiętych do danego wydarzenia.
 */
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { event_id } = req.query as { event_id?: string };

    if (!event_id) {
      return res
        .status(400)
        .json({ message: "Brak parametru event_id" });
    }

    const vendors = await Vendor.findAll({
      where: { event_id },
      order: [["name", "ASC"]],
    });

    return res.json(vendors);
  } catch (err) {
    console.error("Error fetching vendors:", err);
    return res
      .status(500)
      .json({ message: "Błąd pobierania usługodawców" });
  }
});

/**
 * POST /vendors
 * Tworzy nowego usługodawcę.
 */
router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      event_id,
      name,
      type,
      address,
      phone,
      email,
      website,
      google_maps_url,
      notes,
      lat,
      lng,
    } = req.body as {
      event_id?: string;
      name?: string;
      type?: string;
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      google_maps_url?: string;
      notes?: string;
      lat?: number | null;
      lng?: number | null;
    };

    if (!event_id || !name) {
      return res.status(400).json({
        message:
          "event_id i name są wymagane do utworzenia usługodawcy",
      });
    }

    const vendor = await Vendor.create({
      event_id,
      name,
      type: type ?? null,
      address: address ?? null,
      phone: phone ?? null,
      email: email ?? null,
      website: website ?? null,
      google_maps_url: google_maps_url ?? null,
      notes: notes ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
    });

    return res.status(201).json(vendor);
  } catch (err) {
    console.error("Error creating vendor:", err);
    return res
      .status(500)
      .json({ message: "Błąd tworzenia usługodawcy" });
  }
});

/**
 * PUT /vendors/:id
 * Aktualizuje istniejącego usługodawcę.
 */
router.put(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const vendor = await Vendor.findByPk(id);

      if (!vendor) {
        return res
          .status(404)
          .json({ message: "Usługodawca nie został znaleziony" });
      }

      const {
        name,
        type,
        address,
        phone,
        email,
        website,
        google_maps_url,
        notes,
        lat,
        lng,
      } = req.body as {
        name?: string;
        type?: string;
        address?: string;
        phone?: string;
        email?: string;
        website?: string;
        google_maps_url?: string;
        notes?: string;
        lat?: number | null;
        lng?: number | null;
      };

      await vendor.update({
        name: name ?? vendor.name,
        type: type ?? vendor.type,
        address: address ?? vendor.address,
        phone: phone ?? vendor.phone,
        email: email ?? vendor.email,
        website: website ?? vendor.website,
        google_maps_url:
          google_maps_url ?? vendor.google_maps_url,
        notes: notes ?? vendor.notes,
        lat: lat ?? vendor.lat,
        lng: lng ?? vendor.lng,
      });

      return res.json(vendor);
    } catch (err) {
      console.error("Error updating vendor:", err);
      return res
        .status(500)
        .json({ message: "Błąd aktualizacji usługodawcy" });
    }
  }
);

/**
 * DELETE /vendors/:id
 * Usuwa usługodawcę.
 */
router.delete(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const vendor = await Vendor.findByPk(id);

      if (!vendor) {
        return res
          .status(404)
          .json({ message: "Usługodawca nie został znaleziony" });
      }

      await vendor.destroy();
      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting vendor:", err);
      return res
        .status(500)
        .json({ message: "Błąd usuwania usługodawcy" });
    }
  }
);

export default router;
