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

      // Mapujemy do ujednoliconego formatu "Vendor"
      const result = venues.map((v) => {
        const lat =
          v.lat !== null && v.lat !== undefined
            ? Number(v.lat)
            : null;
        const lng =
          v.lng !== null && v.lng !== undefined
            ? Number(v.lng)
            : null;

        return {
          id: v.id,
          name: v.name,
          address: v.address,
          location:
            lat !== null && lng !== null
              ? { lat, lng }
              : null,
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
