// backend/routes/vendors.ts
import { Router } from "express";
import { Vendor } from "../models/Vendor"; // model Vendor z Sequelize

const router = Router();

// GET /events/:eventId/vendors
router.get("/:eventId/vendors", async (req, res) => {
  const { eventId } = req.params;
  try {
    const vendors = await Vendor.findAll({ where: { event_id: eventId } });
    res.json(vendors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

export default router;
