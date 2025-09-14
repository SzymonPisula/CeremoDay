import { useState } from "react";
import * as XLSX from "xlsx";
import type { Guest, SubGuest } from "../types/guest";

export default function Guests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [form, setForm] = useState<Partial<Guest>>({});
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [subForm, setSubForm] = useState<Partial<SubGuest>>({});
  const [editingSubGuest, setEditingSubGuest] = useState<{
    guestId: number;
    sub: SubGuest;
  } | null>(null);

  // Dodaj głównego gościa
  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) return;

    const newGuest: Guest = {
      id: Date.now(),
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone || "",
      email: form.email || "",
      relation: (form.relation as Guest["relation"]) || "znajomy",
      side: (form.side as Guest["side"]) || "panna młoda",
      allergens: form.allergens || "",
      notes: form.notes || "",
      rsvp: (form.rsvp as Guest["rsvp"]) || "brak odpowiedzi",
      subGuests: [],
    };

    setGuests([...guests, newGuest]);
    setForm({});
  };

  // Usuń głównego gościa
  const handleDeleteGuest = (id: number) => {
    setGuests(guests.filter((g) => g.id !== id));
  };

  // Edytuj dane głównego gościa
  const handleSaveGuest = () => {
    if (!editingGuest) return;
    setGuests(
      guests.map((g) => (g.id === editingGuest.id ? editingGuest : g))
    );
    setEditingGuest(null);
  };

  // Dodaj podgościa
  const handleAddSubGuest = (guestId: number, sub: Partial<SubGuest>) => {
    setGuests(
      guests.map((g) =>
        g.id === guestId
          ? {
              ...g,
              subGuests: [
                ...g.subGuests,
                {
                  id: Date.now(),
                  firstName: sub.firstName || "",
                  relation: sub.relation || "dziecko",
                  allergens: sub.allergens || "",
                  notes: sub.notes || "",
                  rsvp: sub.rsvp || "brak odpowiedzi",
                },
              ],
            }
          : g
      )
    );
  };

  // Usuń podgościa
  const handleDeleteSubGuest = (guestId: number, subId: number) => {
    setGuests(
      guests.map((g) =>
        g.id === guestId
          ? {
              ...g,
              subGuests: g.subGuests.filter((sg) => sg.id !== subId),
            }
          : g
      )
    );
  };

  // Zapisz edycję podgościa
  const handleSaveSubGuest = () => {
    if (!editingSubGuest) return;
    setGuests(
      guests.map((g) =>
        g.id === editingSubGuest.guestId
          ? {
              ...g,
              subGuests: g.subGuests.map((sg) =>
                sg.id === editingSubGuest.sub.id ? editingSubGuest.sub : sg
              ),
            }
          : g
      )
    );
    setEditingSubGuest(null);
  };

  // Eksport do Excela
  const exportExcel = () => {
    const flat = guests.flatMap((g) => [
      {
        id: g.id,
        imie: g.firstName,
        nazwisko: g.lastName,
        telefon: g.phone,
        email: g.email,
        status: g.relation,
        strona: g.side,
        alergeny: g.allergens,
        notatki: g.notes,
        rsvp: g.rsvp,
      },
      ...g.subGuests.map((sg) => ({
        id: sg.id,
        imie: sg.firstName,
        nazwisko: "(podgość)",
        telefon: "",
        email: "",
        status: sg.relation,
        strona: "",
        alergeny: sg.allergens,
        notatki: sg.notes,
        rsvp: sg.rsvp,
      })),
    ]);

    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Goście");
    XLSX.writeFile(wb, "lista-gosci.xlsx");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Lista gości</h1>

      {/* Formularz dodawania nowego gościa */}
      <form onSubmit={handleAddGuest} className="grid grid-cols-2 gap-2 mb-6">
        <input
          placeholder="Imię"
          value={form.firstName || ""}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Nazwisko"
          value={form.lastName || ""}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Telefon"
          value={form.phone || ""}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Email"
          value={form.email || ""}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border p-2 rounded"
        />
        <select
          value={form.relation || "znajomy"}
          onChange={(e) =>
            setForm({ ...form, relation: e.target.value as Guest["relation"] })
          }
          className="border p-2 rounded"
        >
          <option>rodzic</option>
          <option>dziadkowie</option>
          <option>wujostwo</option>
          <option>kuzynostwo</option>
          <option>znajomy</option>
          <option>usługodawca</option>
        </select>
        <select
          value={form.side || "panna młoda"}
          onChange={(e) =>
            setForm({ ...form, side: e.target.value as Guest["side"] })
          }
          className="border p-2 rounded"
        >
          <option>panna młoda</option>
          <option>pan młody</option>
        </select>
        <input
          placeholder="Alergeny"
          value={form.allergens || ""}
          onChange={(e) => setForm({ ...form, allergens: e.target.value })}
          className="border p-2 rounded col-span-2"
        />
        <input
          placeholder="Notatki"
          value={form.notes || ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="border p-2 rounded col-span-2"
        />
        <select
          value={form.rsvp || "brak odpowiedzi"}
          onChange={(e) =>
            setForm({ ...form, rsvp: e.target.value as Guest["rsvp"] })
          }
          className="border p-2 rounded col-span-2"
        >
          <option>tak</option>
          <option>nie</option>
          <option>brak odpowiedzi</option>
        </select>
        <button
          type="submit"
          className="col-span-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Dodaj gościa
        </button>
      </form>

      {/* Lista gości */}
      {guests.length === 0 ? (
        <p>Brak gości na liście.</p>
      ) : (
        <div>
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2">Imię i nazwisko</th>
                <th className="border px-3 py-2">Telefon</th>
                <th className="border px-3 py-2">Email</th>
                <th className="border px-3 py-2">Status</th>
                <th className="border px-3 py-2">Strona</th>
                <th className="border px-3 py-2">RSVP</th>
                <th className="border px-3 py-2">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id}>
                  <td className="border px-3 py-2">
                    {g.firstName} {g.lastName}
                  </td>
                  <td className="border px-3 py-2">{g.phone}</td>
                  <td className="border px-3 py-2">{g.email}</td>
                  <td className="border px-3 py-2">{g.relation}</td>
                  <td className="border px-3 py-2">{g.side}</td>
                  <td className="border px-3 py-2">{g.rsvp}</td>
                  <td className="border px-3 py-2 space-x-2">
                    <button
                      onClick={() => setEditingGuest(g)}
                      className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => handleDeleteGuest(g.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={exportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Eksportuj do Excel
          </button>
        </div>
      )}

      {/* Modal edycji gościa */}
      {editingGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Edycja gościa</h2>
            <input
              className="border p-2 rounded mb-2 w-full"
              value={editingGuest.firstName}
              onChange={(e) =>
                setEditingGuest({ ...editingGuest, firstName: e.target.value })
              }
            />
            <input
              className="border p-2 rounded mb-2 w-full"
              value={editingGuest.lastName}
              onChange={(e) =>
                setEditingGuest({ ...editingGuest, lastName: e.target.value })
              }
            />
            <input
              className="border p-2 rounded mb-2 w-full"
              value={editingGuest.phone}
              onChange={(e) =>
                setEditingGuest({ ...editingGuest, phone: e.target.value })
              }
            />
            <input
              className="border p-2 rounded mb-2 w-full"
              value={editingGuest.email}
              onChange={(e) =>
                setEditingGuest({ ...editingGuest, email: e.target.value })
              }
            />
            <input
              className="border p-2 rounded mb-2 w-full"
              value={editingGuest.allergens}
              onChange={(e) =>
                setEditingGuest({
                  ...editingGuest,
                  allergens: e.target.value,
                })
              }
              placeholder="Alergeny"
            />
            <textarea
              className="border p-2 rounded mb-2 w-full"
              value={editingGuest.notes}
              onChange={(e) =>
                setEditingGuest({ ...editingGuest, notes: e.target.value })
              }
              placeholder="Notatki"
            />

            {/* Sekcja podgości */}
            <h3 className="text-lg font-semibold mt-4">Podgoście</h3>
            <ul className="mb-2">
              {editingGuest.subGuests.map((sg) => (
                <li
                  key={sg.id}
                  className="flex justify-between border p-2 rounded mb-2"
                >
                  <span>
                    {sg.firstName} ({sg.relation}) - {sg.rsvp}
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() =>
                        setEditingSubGuest({ guestId: editingGuest.id, sub: sg })
                      }
                      className="px-2 py-1 bg-yellow-500 text-white rounded"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteSubGuest(editingGuest.id, sg.id)
                      }
                      className="px-2 py-1 bg-red-500 text-white rounded"
                    >
                      Usuń
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Dodawanie podgościa */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddSubGuest(editingGuest.id, subForm);
                setSubForm({});
              }}
              className="grid grid-cols-2 gap-2 mb-4"
            >
              <input
                placeholder="Imię"
                value={subForm.firstName || ""}
                onChange={(e) =>
                  setSubForm({ ...subForm, firstName: e.target.value })
                }
                className="border p-2 rounded"
              />
              <input
                placeholder="Relacja"
                value={subForm.relation || ""}
                onChange={(e) =>
                  setSubForm({ ...subForm, relation: e.target.value })
                }
                className="border p-2 rounded"
              />
              <input
                placeholder="Alergeny"
                value={subForm.allergens || ""}
                onChange={(e) =>
                  setSubForm({ ...subForm, allergens: e.target.value })
                }
                className="border p-2 rounded col-span-2"
              />
              <select
                value={subForm.rsvp || "brak odpowiedzi"}
                onChange={(e) =>
                  setSubForm({
                    ...subForm,
                    rsvp: e.target.value as SubGuest["rsvp"],
                  })
                }
                className="border p-2 rounded col-span-2"
              >
                <option>tak</option>
                <option>nie</option>
                <option>brak odpowiedzi</option>
              </select>
              <button
                type="submit"
                className="col-span-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Dodaj podgościa
              </button>
            </form>

            {/* Przyciski zapis/wyjście */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleSaveGuest}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Zapisz
              </button>
              <button
                onClick={() => setEditingGuest(null)}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji podgościa */}
      {editingSubGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edycja podgościa</h2>
            <input
              className="border p-2 rounded mb-2 w-full"
              value={editingSubGuest.sub.firstName}
              onChange={(e) =>
                setEditingSubGuest({
                  ...editingSubGuest,
                  sub: { ...editingSubGuest.sub, firstName: e.target.value },
                })
              }
            />
            <input
              className="border p-2 rounded mb-2 w-full"
              value={editingSubGuest.sub.relation}
              onChange={(e) =>
                setEditingSubGuest({
                  ...editingSubGuest,
                  sub: { ...editingSubGuest.sub, relation: e.target.value },
                })
              }
            />
            <input
              className="border p-2 rounded mb-2 w-full"
              value={editingSubGuest.sub.allergens}
              onChange={(e) =>
                setEditingSubGuest({
                  ...editingSubGuest,
                  sub: { ...editingSubGuest.sub, allergens: e.target.value },
                })
              }
              placeholder="Alergeny"
            />
            <textarea
              className="border p-2 rounded mb-2 w-full"
              value={editingSubGuest.sub.notes}
              onChange={(e) =>
                setEditingSubGuest({
                  ...editingSubGuest,
                  sub: { ...editingSubGuest.sub, notes: e.target.value },
                })
              }
              placeholder="Notatki"
            />
            <select
              className="border p-2 rounded mb-2 w-full"
              value={editingSubGuest.sub.rsvp}
              onChange={(e) =>
                setEditingSubGuest({
                  ...editingSubGuest,
                  sub: {
                    ...editingSubGuest.sub,
                    rsvp: e.target.value as SubGuest["rsvp"],
                  },
                })
              }
            >
              <option>tak</option>
              <option>nie</option>
              <option>brak odpowiedzi</option>
            </select>

            <div className="flex justify-end space-x-2">
              <button
                onClick={handleSaveSubGuest}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Zapisz
              </button>
              <button
                onClick={() => setEditingSubGuest(null)}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
