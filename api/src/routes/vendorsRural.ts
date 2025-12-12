// CeremoDay/api/src/routes/vendorsRural.ts
import { Router, Response } from "express";
import { Op } from "sequelize";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import RuralVenue from "../models/RuralVenue";

const router = Router();

/**
 * GET /vendors/rural/search
 *
 * Query params:
 *  - county?: string        -> filtr po powiecie
 *  - minCapacity?: number   -> minimalna liczba uczestników
 *  - maxCapacity?: number   -> maksymalna liczba uczestników
 *  - q?: string             -> fraza w nazwie/adresie
 */
router.get(
  "/search",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { county, minCapacity, maxCapacity, q } = req.query as {
        county?: string;
        minCapacity?: string;
        maxCapacity?: string;
        q?: string;
      };

      const where: any = {};

      if (county && county.trim()) {
        where.county = { [Op.like]: `%${county.trim()}%` };
      }

      if (minCapacity || maxCapacity) {
        where.max_participants = {};
        if (minCapacity) {
          where.max_participants[Op.gte] = Number(minCapacity);
        }
        if (maxCapacity) {
          where.max_participants[Op.lte] = Number(maxCapacity);
        }
      }

      if (q && q.trim()) {
        const term = `%${q.trim()}%`;
        where[Op.or] = [
          { name: { [Op.like]: term } },
          { address: { [Op.like]: term } },
          { commune_office: { [Op.like]: term } },
        ];
      }

      const venues = await RuralVenue.findAll({
        where,
        order: [["name", "ASC"]],
      });

      console.log("🧩 /vendors/rural/search – liczba rekordów:", venues.length);
      console.log(
        "🧩 Przykładowe współrzędne z bazy:",
        venues.slice(0, 5).map((v) => ({
          id: v.id,
          lat: v.lat,
          lng: v.lng,
        }))
      );

      const result = venues.map((v) => {
        // Uwaga: lat/lng mogą być stringami (DECIMAL z MySQL)
        const rawLat = v.lat;
        const rawLng = v.lng;

        const lat =
          rawLat === null || rawLat === undefined
            ? null
            : Number.parseFloat(String(rawLat));
        const lng =
          rawLng === null || rawLng === undefined
            ? null
            : Number.parseFloat(String(rawLng));

        const hasValidCoords =
          lat !== null &&
          lng !== null &&
          !Number.isNaN(lat) &&
          !Number.isNaN(lng);

        if (!hasValidCoords && (lat !== null || lng !== null)) {
          console.warn("⚠️ Nieprawidłowe współrzędne dla venue", {
            id: v.id,
            rawLat,
            rawLng,
            lat,
            lng,
          });
        }

        return {
          id: v.id,
          name: v.name,
          address: v.address,
          // UJEDNOLICONY format dla frontu
          location: hasValidCoords ? { lat, lng } : null,

          // Dodatkowo surowe lat/lng – na wszelki wypadek i do debugowania
          lat: hasValidCoords ? lat : null,
          lng: hasValidCoords ? lng : null,

          max_participants: v.max_participants ?? undefined,
          equipment: v.equipment ?? undefined,
          rental_info: v.rental_info ?? undefined,
          pricing: v.pricing ?? undefined,
          county: v.county ?? undefined,
          source: "RURAL" as const,
        };
      });

      return res.json(result);
    } catch (err) {
      console.error("Error searching rural venues:", err);
      return res
        .status(500)
        .json({ message: "Błąd pobierania sal gminnych" });
    }
  }
);

export default router;
