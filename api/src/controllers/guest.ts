import { Request, Response } from "express";
import { Guest } from "../models/Guest";

export const getGuests = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const guests = await Guest.findAll({
      where: { event_id: eventId, parent_guest_id: null },
      include: [{ model: Guest, as: "SubGuests" }]
    });
    res.json(guests);
  } catch (error) {
    console.error("Błąd getGuests:", error);
    res.status(500).json({ message: "Błąd serwera podczas pobierania gości" });
  }
};

export const createGuest = async (req: Request, res: Response) => {
  try {
    const guest = await Guest.create({ ...req.body });
    res.json(guest);
  } catch (error) {
    console.error("Błąd createGuest:", error);
    res.status(500).json({ message: "Błąd serwera podczas dodawania gościa" });
  }
};

export const updateGuest = async (req: Request, res: Response) => {
  try {
    const guest = await Guest.findByPk(req.params.id);
    if (!guest) return res.status(404).json({ message: "Nie znaleziono gościa" });
    await guest.update(req.body);
    res.json(guest);
  } catch (error) {
    console.error("Błąd updateGuest:", error);
    res.status(500).json({ message: "Błąd serwera podczas aktualizacji gościa" });
  }
};

export const deleteGuest = async (req: Request, res: Response) => {
  try {
    const guest = await Guest.findByPk(req.params.id);
    if (!guest) return res.status(404).json({ message: "Nie znaleziono gościa" });
    await guest.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error("Błąd deleteGuest:", error);
    res.status(500).json({ message: "Błąd serwera podczas usuwania gościa" });
  }
};
