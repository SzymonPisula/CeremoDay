// CeremoDay/api/src/routes/vendors.ts
import { Router, Response } from "express";

import { AuthRequest, authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  requireActiveMemberFromBody,
  requireActiveMemberFromQuery,
} from "../middleware/requireActiveMember";
import { requireActiveMemberForModel } from "../middleware/requireActiveMemberForModel";
import { ApiError } from "../utils/apiError";

import Vendor from "../models/Vendor";
import { vendorCreateApiSchema, vendorUpdateApiSchema } from "../validation/vendor.schema";

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
 * GET /vendors?event_id=...
 * Lista usługodawców przypiętych do wydarzenia.
 */
router.get(
  "/",
  authMiddleware,
  requireActiveMemberFromQuery("event_id"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { event_id } = req.query as { event_id?: string };

      const vendors = await Vendor.findAll({
        where: { event_id },
        order: [["name", "ASC"]],
      });

      return res.json(vendors);
    } catch (err) {
      console.error("Error fetching vendors:", err);
      throw new ApiError(500, "UNKNOWN_ERROR", "Błąd pobierania usługodawców");
    }
  }
);

/**
 * POST /vendors
 * Tworzy nowego usługodawcę.
 */
router.post(
  "/",
  authMiddleware,
  validateBody(vendorCreateApiSchema),
  requireActiveMemberFromBody("event_id"),
  async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body as any;

      const vendor = await Vendor.create({
        event_id: body.event_id,
        name: body.name,
        type: body.type ?? null,

        address: body.address ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        website: body.website ?? null,
        google_maps_url: body.google_maps_url ?? null,
        notes: body.notes ?? null,

        // snapshot (rural/google)
        county: body.county ?? null,
        max_participants: body.max_participants ?? null,
        equipment: body.equipment ?? null,
        pricing: body.pricing ?? null,
        rental_info: body.rental_info ?? null,
        commune_office: body.commune_office ?? null,
        rural_type: body.rural_type ?? null,
        usable_area: body.usable_area ?? null,

        lat: body.lat ?? null,
        lng: body.lng ?? null,
      });

      return res.status(201).json(vendor);
    } catch (err) {
      console.error("Error creating vendor:", err);
      throw new ApiError(500, "UNKNOWN_ERROR", "Błąd tworzenia usługodawcy");
    }
  }
);

/**
 * PUT /vendors/:id
 * Aktualizuje istniejącego usługodawcę.
 */
router.put(
  "/:id",
  authMiddleware,
  validateBody(vendorUpdateApiSchema),
requireActiveMemberForModel({
  model: Vendor as any,
  idParam: "id",
  label: "usługodawca",
}),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = requireId(res, req.params.id, "id usługodawcy");
if (!id) return;

const vendor = await Vendor.findByPk(id);

      if (!vendor) {
        throw new ApiError(404, "NOT_FOUND", "Usługodawca nie został znaleziony");
      }

      const body = req.body as any;

      await vendor.update({
        // core
        name: body.name ?? vendor.name,
        type: body.type ?? vendor.type,
        address: body.address ?? vendor.address,
        phone: body.phone ?? vendor.phone,
        email: body.email ?? vendor.email,
        website: body.website ?? vendor.website,
        google_maps_url: body.google_maps_url ?? vendor.google_maps_url,
        notes: body.notes ?? vendor.notes,

        // snapshot
        county: body.county ?? vendor.county,
        max_participants: body.max_participants ?? vendor.max_participants,
        equipment: body.equipment ?? vendor.equipment,
        pricing: body.pricing ?? vendor.pricing,
        rental_info: body.rental_info ?? vendor.rental_info,
        commune_office: body.commune_office ?? vendor.commune_office,
        rural_type: body.rural_type ?? vendor.rural_type,
        usable_area: body.usable_area ?? vendor.usable_area,
        lat: body.lat ?? vendor.lat,
        lng: body.lng ?? vendor.lng,
      });

      return res.json(vendor);
    } catch (err) {
      console.error("Error updating vendor:", err);
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "UNKNOWN_ERROR", "Błąd aktualizacji usługodawcy");
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
requireActiveMemberForModel({
  model: Vendor as any,
  idParam: "id",
  label: "usługodawca",
}),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = requireId(res, req.params.id, "id usługodawcy");
if (!id) return;

const vendor = await Vendor.findByPk(id);

      if (!vendor) {
        throw new ApiError(404, "NOT_FOUND", "Usługodawca nie został znaleziony");
      }

      await vendor.destroy();
      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting vendor:", err);
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "UNKNOWN_ERROR", "Błąd usuwania usługodawcy");
    }
  }
);

export default router;
