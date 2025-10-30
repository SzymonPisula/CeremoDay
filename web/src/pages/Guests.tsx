import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Guest, GuestPayload } from "../types/guest";


const Guests = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [editingSubGuestId, setEditingSubGuestId] = useState<string | null>(null);

  const [guestForm, setGuestForm] = useState<GuestPayload>({
    event_id: eventId!,
    first_name: "",
    last_name: "",
  });

  const [subGuestForm, setSubGuestForm] = useState<GuestPayload>({
    event_id: eventId!,
    parent_guest_id: "",
    first_name: "",
    last_name: "",
  });

  useEffect(() => {
  const fetchGuests = async () => {
    try {
      const data: Guest[] = await api.getGuests(eventId!);
      setGuests(data);
    } catch (err) {
      console.error(err);
    }
  };
  fetchGuests();
}, [eventId]);
  

  // ----- GŁÓWNY GOŚĆ -----
  const handleAddGuest = async () => {
    if (!eventId) return;
    try {
      const newGuest = await api.createGuest({ ...guestForm, event_id: eventId });
      setGuests([...guests, newGuest]);
      setGuestForm({ event_id: eventId, first_name: "", last_name: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateGuest = async (id: string) => {
    try {
      const updatedGuest = await api.updateGuest(id, guestForm);
      setGuests(guests.map(g => (g.id === id ? updatedGuest : g)));
      setEditingGuestId(null);
      setGuestForm({ event_id: eventId!, first_name: "", last_name: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGuest = async (id: string) => {
    try {
      await api.deleteGuest(id);
      setGuests(guests.filter(g => g.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // ----- PODGOŚĆ -----
  const handleAddSubGuest = async (parentId: string) => {
    try {
      const payload = { ...subGuestForm, event_id: eventId!, parent_guest_id: parentId };
      const newSubGuest = await api.createGuest(payload);
      setGuests(guests.map(g =>
        g.id === parentId ? { ...g, SubGuests: [...(g.SubGuests || []), newSubGuest] } : g
      ));
      setSubGuestForm({ event_id: eventId!, parent_guest_id: "", first_name: "", last_name: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSubGuest = async (subId: string, parentId: string) => {
    try {
      const updatedSub = await api.updateGuest(subId, subGuestForm);
      setGuests(guests.map(g =>
        g.id === parentId
          ? {
              ...g,
              SubGuests: g.SubGuests?.map(sg => (sg.id === subId ? updatedSub : sg)),
            }
          : g
      ));
      setEditingSubGuestId(null);
      setSubGuestForm({ event_id: eventId!, parent_guest_id: "", first_name: "", last_name: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubGuest = async (subId: string, parentId: string) => {
    try {
      await api.deleteGuest(subId);
      setGuests(guests.map(g =>
        g.id === parentId
          ? { ...g, SubGuests: g.SubGuests?.filter(sg => sg.id !== subId) }
          : g
      ));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Goście</h2>

      {/* Dodawanie głównego gościa */}
      // Fragment formularza dla głównego gościa
<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-2">
  {/* Pola tekstowe */}
  <input
    placeholder="Imię"
    value={guestForm.first_name}
    onChange={e => setGuestForm({ ...guestForm, first_name: e.target.value })}
    className="border p-2 rounded"
  />
  <input
    placeholder="Nazwisko"
    value={guestForm.last_name}
    onChange={e => setGuestForm({ ...guestForm, last_name: e.target.value })}
    className="border p-2 rounded"
  />
  <input
    placeholder="Telefon"
    value={guestForm.phone || ""}
    onChange={e => setGuestForm({ ...guestForm, phone: e.target.value })}
    className="border p-2 rounded"
  />
  <input
    placeholder="Email"
    value={guestForm.email || ""}
    onChange={e => setGuestForm({ ...guestForm, email: e.target.value })}
    className="border p-2 rounded"
  />
  <textarea
    placeholder="Alergeny"
    value={guestForm.allergens || ""}
    onChange={e => setGuestForm({ ...guestForm, allergens: e.target.value })}
    className="border p-2 rounded col-span-2"
  />
  <textarea
    placeholder="Notatki"
    value={guestForm.notes || ""}
    onChange={e => setGuestForm({ ...guestForm, notes: e.target.value })}
    className="border p-2 rounded col-span-2"
  />

  {/* Pola select */}
  <select
    value={guestForm.relation || ""}
    onChange={e => setGuestForm({ ...guestForm, relation: e.target.value })}
    className="border p-2 rounded"
  >
    <option value="">Wybierz relację</option>
    <option value="dziadkowie">Dziadkowie</option>
    <option value="wujostwo">Wujostwo</option>
    <option value="kuzynostwo">Kuzynostwo</option>
    <option value="przyjaciele">Przyjaciele</option>
    <option value="znajomi">Znajomi</option>
    <option value="praca">Praca</option>
  </select>

  <select
    value={guestForm.side || ""}
    onChange={e => setGuestForm({ ...guestForm, side: e.target.value })}
    className="border p-2 rounded"
  >
    <option value="">Wybierz stronę</option>
    <option value="Pani młodej">Pani młodej</option>
    <option value="Pana młodego">Pana młodego</option>
  </select>

  <select
    value={guestForm.rsvp || ""}
    onChange={e => setGuestForm({ ...guestForm, rsvp: e.target.value })}
    className="border p-2 rounded"
  >
    <option value="">Wybierz RSVP</option>
    <option value="Potwierdzone">Potwierdzone</option>
    <option value="Odmowa">Odmowa</option>
    <option value="Nieznane">Nieznane</option>
  </select>

  {/* Przycisk */}
  <button
    onClick={editingGuestId ? () => handleUpdateGuest(editingGuestId) : handleAddGuest}
    className="bg-blue-500 text-white px-4 rounded col-span-2 md:col-span-1"
  >
    {editingGuestId ? "Zapisz" : "Dodaj"}
  </button>
</div>


      {/* Lista gości */}
      {guests.length === 0 && <p>Brak gości</p>}

      {guests.map(guest => (
        <div key={guest.id} className="mb-4 p-4 border rounded">
          <div className="flex justify-between items-center mb-2">
            <span>{guest.first_name} {guest.last_name}</span>
            <div className="flex gap-2">
              <button
                className="text-sm text-blue-500"
                onClick={() => { setEditingGuestId(guest.id!); setGuestForm({ ...guest }); }}
              >
                Edytuj
              </button>
              <button
                className="text-sm text-red-500"
                onClick={() => handleDeleteGuest(guest.id!)}
              >
                Usuń
              </button>
            </div>
          </div>

          {/* Podgoście */}
          <div className="ml-4">
            {(guest.SubGuests || []).map(sg => (
              <div key={sg.id} className="flex justify-between items-center mb-1">
                <span>{sg.first_name} {sg.last_name}</span>
                <div className="flex gap-2">
                  <button
                    className="text-sm text-blue-500"
                    onClick={() => { setEditingSubGuestId(sg.id!); setSubGuestForm({ ...sg }); }}
                  >
                    Edytuj
                  </button>
                  <button
                    className="text-sm text-red-500"
                    onClick={() => handleDeleteSubGuest(sg.id!, guest.id!)}
                  >
                    Usuń
                  </button>
                </div>
              </div>
            ))}

            <div className="flex gap-2 mt-2">
              <input
                placeholder="Imię podgościa"
                value={subGuestForm.first_name}
                onChange={e => setSubGuestForm({ ...subGuestForm, first_name: e.target.value })}
                className="border p-1 rounded"
              />
              <input
                placeholder="Nazwisko podgościa"
                value={subGuestForm.last_name}
                onChange={e => setSubGuestForm({ ...subGuestForm, last_name: e.target.value })}
                className="border p-1 rounded"
              />
              <button
                className="bg-green-500 text-white px-2 rounded"
                onClick={() => handleAddSubGuest(guest.id!)}
              >
                Dodaj podgościa
              </button>
              {editingSubGuestId && (
                <button
                  className="bg-blue-500 text-white px-2 rounded"
                  onClick={() => handleUpdateSubGuest(editingSubGuestId, guest.id!)}
                >
                  Zapisz podgościa
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Guests;
