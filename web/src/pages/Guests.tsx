import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { Guest, GuestPayload } from "../types/guest";

const Modal: React.FC<{ onClose: () => void; title?: string; children: React.ReactNode }> = ({
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const modalRoot =
    document.getElementById("modal-root") ||
    (() => {
      const div = document.createElement("div");
      div.id = "modal-root";
      document.body.appendChild(div);
      return div;
    })();

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999999]"
      style={{
        backgroundColor: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(3px)",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* overlay do zamknięcia */}
      <div
        onClick={onClose}
        className="absolute inset-0 cursor-pointer"
        style={{ background: "transparent" }}
      />

      {/* zawartość */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fadeIn overflow-y-auto max-h-[90vh]"
        style={{
          zIndex: 10000000,
          position: "relative",
        }}
      >
        {title && (
          <h3 className="text-xl font-semibold mb-4 text-center">{title}</h3>
        )}
        {children}
      </div>
    </div>,
    modalRoot
  );
};





const Guests: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editingSubGuest, setEditingSubGuest] = useState<{ parentId: string; sub: Guest } | null>(
    null
  );

  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showAddSubGuestModal, setShowAddSubGuestModal] = useState<{ open: boolean; parentId?: string }>({ open: false });

  const [confirmModal, setConfirmModal] = useState<{
  open: boolean;
  message: string;
  onConfirm?: () => void;
}>({ open: false, message: "" });

  const [guestForm, setGuestForm] = useState<GuestPayload>({
    event_id: eventId ?? "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    relation: "",
    side: "",
    rsvp: "",
    allergens: "",
    notes: "",
  });

  const [subGuestForm, setSubGuestForm] = useState<GuestPayload>({
    event_id: eventId ?? "",
    parent_guest_id: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    relation: "",
    side: "",
    rsvp: "",
    allergens: "",
    notes: "",
  });

  useEffect(() => {
    if (!eventId) return;
    let ignore = false;
    api.getGuests(eventId).then((data) => {
      if (!ignore) setGuests(data);
    });
    return () => {
      ignore = true;
    };
  }, [eventId]);

  const handleExportExcel = () => {
    const data: unknown[] = [];
    guests.forEach((g) => {
      data.push({
        Typ: "Gość",
        Imię: g.first_name,
        Nazwisko: g.last_name,
        Telefon: g.phone,
        Email: g.email,
        Relacja: g.relation,
        Strona: g.side,
        RSVP: g.rsvp,
        Alergeny: g.allergens,
        Notatki: g.notes,
      });
      (g.SubGuests || []).forEach((sg) =>
        data.push({
          Typ: "Podgość",
          Imię: sg.first_name,
          Nazwisko: sg.last_name,
          Telefon: sg.phone,
          Email: sg.email,
          Relacja: sg.relation,
          Strona: sg.side,
          RSVP: sg.rsvp,
          Alergeny: sg.allergens,
          Notatki: sg.notes,
          Rodzic: `${g.first_name} ${g.last_name}`,
        })
      );
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Goście");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "goscie.xlsx");
  };

  const handleAddGuest = async () => {
    if (!eventId) return;
    try {
      const newGuest = await api.createGuest({ ...guestForm, event_id: eventId });
      setGuests((prev) => [...prev, newGuest]);
      setGuestForm({
        event_id: eventId,
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        relation: "",
        side: "",
        rsvp: "",
        allergens: "",
        notes: "",
      });
      setShowAddGuestModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubGuest = async () => {
  if (!showAddSubGuestModal.parentId) return;
  const payload = { ...subGuestForm, event_id: eventId!, parent_guest_id: showAddSubGuestModal.parentId };
  try {
    const newSub = await api.createGuest(payload);
    // Tu łączymy dane z API z tym, co wpisane w formularzu
    const fullSub = { ...newSub, ...subGuestForm }; 
    setGuests((prev) =>
      prev.map((g) =>
        g.id === showAddSubGuestModal.parentId
          ? { ...g, SubGuests: [...(g.SubGuests || []), fullSub] }
          : g
      )
    );
    // Reset formularza i zamknięcie modalu
    setSubGuestForm({
      event_id: eventId ?? "",
      parent_guest_id: "",
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      relation: "",
      side: "",
      rsvp: "",
      allergens: "",
      notes: "",
    });
    setShowAddSubGuestModal({ open: false });
  } catch (err) {
    console.error(err);
  }
};


  const handleDeleteGuest = (id: string) => {
  setConfirmModal({
    open: true,
    message: "Czy na pewno chcesz usunąć tego gościa?",
    onConfirm: async () => {
      try {
        await api.deleteGuest(id);
        setGuests((prev) => prev.filter((g) => g.id !== id));
      } catch (err) {
        console.error(err);
      }
    },
  });
};

const handleDeleteSubGuest = (subId: string, parentId: string) => {
  setConfirmModal({
    open: true,
    message: "Czy na pewno chcesz usunąć tego podgościa?",
    onConfirm: async () => {
      try {
        await api.deleteGuest(subId);
        setGuests((prev) =>
          prev.map((g) =>
            g.id === parentId
              ? { ...g, SubGuests: g.SubGuests?.filter((s) => s.id !== subId) }
              : g
          )
        );
      } catch (err) {
        console.error(err);
      }
    },
  });
};

  const handleSaveEdit = async () => {
    if (!editingGuest) return;
    try {
      const updated = await api.updateGuest(editingGuest.id!, editingGuest);
      if (updated?.id) {
setGuests((prev) =>
  prev.map((g) =>
    g.id === updated.id ? { ...updated, SubGuests: g.SubGuests } : g
  )
);
      }
      setEditingGuest(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSubEdit = async () => {
  if (!editingSubGuest) return;
  try {
    const updated = await api.updateGuest(editingSubGuest.sub.id!, editingSubGuest.sub);
    if (updated?.id) {
      const fullUpdated = { ...updated, ...editingSubGuest.sub }; // połączenie API + formularz
      setGuests((prev) =>
        prev.map((g) =>
          g.id === editingSubGuest.parentId
            ? {
                ...g,
                SubGuests: g.SubGuests?.map((s) =>
                  s.id === fullUpdated.id ? fullUpdated : s
                ),
              }
            : g
        )
      );
    }
    setEditingSubGuest(null);
  } catch (err) {
    console.error(err);
  }
};


  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Goście</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddGuestModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            ➕ Dodaj gościa
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-green-600 text-white px-3 py-2 rounded"
          >
            Eksportuj do Excela
          </button>
        </div>
      </div>

      {guests.length === 0 ? (
        <p>Brak gości</p>
      ) : (
        <ol className="list-decimal pl-5 space-y-4">
  {guests.map((guest) => (
    <li key={guest.id} className="bg-white p-4 rounded-xl border shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-lg">
            {guest.first_name} {guest.last_name}
          </p>
          <p className="text-sm text-gray-600">
            📞 {guest.phone || "-"} | ✉️ {guest.email || "-"}
          </p>
          <p className="text-sm">
            Relacja: {guest.relation || "-"} | Strona: {guest.side || "-"} | RSVP:{" "}
            {guest.rsvp || "-"}
          </p>
          <p className="text-sm">Alergeny: {guest.allergens || "-"}</p>
          <p className="text-sm italic">Notatki: {guest.notes || "-"}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setEditingGuest(guest)} className="text-blue-600 hover:underline">
            Edytuj
          </button>
          <button onClick={() => handleDeleteGuest(guest.id!)} className="text-red-600">
            Usuń
          </button>
          <button
            onClick={() => setShowAddSubGuestModal({ open: true, parentId: guest.id! })}
            className="text-green-600 hover:underline"
          >
            ➕ Podgość
          </button>
        </div>
      </div>

      <ol className="pl-6 mt-3 space-y-2 border-l-2 border-gray-200 list-decimal">
        {(guest.SubGuests || []).map((sg) => (
          <li key={sg.id} className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {sg.first_name} {sg.last_name}
                </p>
                <p className="text-sm">
                  RSVP: {sg.rsvp || "-"} | Alergeny: {sg.allergens || "-"}
                </p>
                <p className="text-sm italic">Notatki: {sg.notes || "-"}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSubGuest({ parentId: guest.id!, sub: sg })}
                  className="text-blue-600 hover:underline"
                >
                  Edytuj
                </button>
                <button
                  onClick={() => handleDeleteSubGuest(sg.id!, guest.id!)}
                  className="text-red-600"
                >
                  Usuń
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </li>
  ))}
</ol>

      )}

      {/* === MODAL: Dodaj gościa === */}
{showAddGuestModal && (
  <Modal onClose={() => setShowAddGuestModal(false)} title="Dodaj gościa">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <input placeholder="Imię" value={guestForm.first_name} onChange={(e) => setGuestForm({ ...guestForm, first_name: e.target.value })} className="border p-2 rounded" />
      <input placeholder="Nazwisko" value={guestForm.last_name} onChange={(e) => setGuestForm({ ...guestForm, last_name: e.target.value })} className="border p-2 rounded" />
      <input placeholder="Telefon" value={guestForm.phone || ""} onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })} className="border p-2 rounded" />
      <input placeholder="Email" value={guestForm.email || ""} onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })} className="border p-2 rounded" />

      <select value={guestForm.relation || ""} onChange={(e) => setGuestForm({ ...guestForm, relation: e.target.value })} className="border p-2 rounded">
        <option value="">Relacja</option>
        <option value="dziadkowie">Dziadkowie</option>
        <option value="wujostwo">Wujostwo</option>
        <option value="kuzynostwo">Kuzynostwo</option>
        <option value="przyjaciele">Przyjaciele</option>
        <option value="znajomi">Znajomi</option>
        <option value="praca">Praca</option>
      </select>

      <select value={guestForm.side || ""} onChange={(e) => setGuestForm({ ...guestForm, side: e.target.value })} className="border p-2 rounded">
        <option value="">Strona</option>
        <option value="Pani młodej">Pani młodej</option>
        <option value="Pana młodego">Pana młodego</option>
      </select>

      <select value={guestForm.rsvp || ""} onChange={(e) => setGuestForm({ ...guestForm, rsvp: e.target.value })} className="border p-2 rounded">
        <option value="">RSVP</option>
        <option value="Potwierdzone">Potwierdzone</option>
        <option value="Odmowa">Odmowa</option>
        <option value="Nieznane">Nieznane</option>
      </select>

      <textarea placeholder="Alergeny" value={guestForm.allergens || ""} onChange={(e) => setGuestForm({ ...guestForm, allergens: e.target.value })} className="border p-2 rounded col-span-2" />
      <textarea placeholder="Notatki" value={guestForm.notes || ""} onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })} className="border p-2 rounded col-span-2" />
    </div>
    <div className="mt-4 flex justify-end gap-2">
      <button onClick={() => setShowAddGuestModal(false)} className="px-3 py-2 border rounded">Anuluj</button>
      <button onClick={handleAddGuest} className="bg-blue-600 text-white px-3 py-2 rounded">Dodaj</button>
    </div>
  </Modal>
)}


      {/* === MODAL: Dodaj podgościa === */}
{showAddSubGuestModal.open && (
  <Modal onClose={() => setShowAddSubGuestModal({ open: false })} title="Dodaj podgościa">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <input placeholder="Imię" value={subGuestForm.first_name} onChange={(e) => setSubGuestForm({ ...subGuestForm, first_name: e.target.value })} className="border p-2 rounded" />
      <input placeholder="Nazwisko" value={subGuestForm.last_name} onChange={(e) => setSubGuestForm({ ...subGuestForm, last_name: e.target.value })} className="border p-2 rounded" />

      <select value={subGuestForm.relation || ""} onChange={(e) => setSubGuestForm({ ...subGuestForm, relation: e.target.value })} className="border p-2 rounded">
        <option value="">Relacja</option>
        <option value="dziadkowie">Dziadkowie</option>
        <option value="wujostwo">Wujostwo</option>
        <option value="kuzynostwo">Kuzynostwo</option>
        <option value="przyjaciele">Przyjaciele</option>
        <option value="znajomi">Znajomi</option>
        <option value="praca">Praca</option>
      </select>

      <select value={subGuestForm.side || ""} onChange={(e) => setSubGuestForm({ ...subGuestForm, side: e.target.value })} className="border p-2 rounded">
        <option value="">Strona</option>
        <option value="Pani młodej">Pani młodej</option>
        <option value="Pana młodego">Pana młodego</option>
      </select>

      <select value={subGuestForm.rsvp || ""} onChange={(e) => setSubGuestForm({ ...subGuestForm, rsvp: e.target.value })} className="border p-2 rounded">
        <option value="">RSVP</option>
        <option value="Potwierdzone">Potwierdzone</option>
        <option value="Odmowa">Odmowa</option>
        <option value="Nieznane">Nieznane</option>
      </select>

      <textarea placeholder="Alergeny" value={subGuestForm.allergens || ""} onChange={(e) => setSubGuestForm({ ...subGuestForm, allergens: e.target.value })} className="border p-2 rounded col-span-2" />
      <textarea placeholder="Notatki" value={subGuestForm.notes || ""} onChange={(e) => setSubGuestForm({ ...subGuestForm, notes: e.target.value })} className="border p-2 rounded col-span-2" />
    </div>
    <div className="mt-4 flex justify-end gap-2">
      <button onClick={() => setShowAddSubGuestModal({ open: false })} className="px-3 py-2 border rounded">Anuluj</button>
      <button onClick={handleAddSubGuest} className="bg-blue-600 text-white px-3 py-2 rounded">Dodaj</button>
    </div>
  </Modal>
)}



      {/* === MODAL: Edycja gościa === */}
{editingGuest && (
  <Modal onClose={() => setEditingGuest(null)} title="Edytuj dane gościa">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <input placeholder="Imię" value={editingGuest.first_name} onChange={(e) => setEditingGuest({ ...editingGuest, first_name: e.target.value })} className="border p-2 rounded" />
      <input placeholder="Nazwisko" value={editingGuest.last_name} onChange={(e) => setEditingGuest({ ...editingGuest, last_name: e.target.value })} className="border p-2 rounded" />
      <input placeholder="Telefon" value={editingGuest.phone || ""} onChange={(e) => setEditingGuest({ ...editingGuest, phone: e.target.value })} className="border p-2 rounded" />
      <input placeholder="Email" value={editingGuest.email || ""} onChange={(e) => setEditingGuest({ ...editingGuest, email: e.target.value })} className="border p-2 rounded" />

      <select value={editingGuest.relation || ""} onChange={(e) => setEditingGuest({ ...editingGuest, relation: e.target.value })} className="border p-2 rounded">
        <option value="">Relacja</option>
        <option value="dziadkowie">Dziadkowie</option>
        <option value="wujostwo">Wujostwo</option>
        <option value="kuzynostwo">Kuzynostwo</option>
        <option value="przyjaciele">Przyjaciele</option>
        <option value="znajomi">Znajomi</option>
        <option value="praca">Praca</option>
      </select>

      <select value={editingGuest.side || ""} onChange={(e) => setEditingGuest({ ...editingGuest, side: e.target.value })} className="border p-2 rounded">
        <option value="">Strona</option>
        <option value="Pani młodej">Pani młodej</option>
        <option value="Pana młodego">Pana młodego</option>
      </select>

      <select value={editingGuest.rsvp || ""} onChange={(e) => setEditingGuest({ ...editingGuest, rsvp: e.target.value })} className="border p-2 rounded">
        <option value="">RSVP</option>
        <option value="Potwierdzone">Potwierdzone</option>
        <option value="Odmowa">Odmowa</option>
        <option value="Nieznane">Nieznane</option>
      </select>

      <textarea placeholder="Alergeny" value={editingGuest.allergens || ""} onChange={(e) => setEditingGuest({ ...editingGuest, allergens: e.target.value })} className="border p-2 rounded col-span-2" />
      <textarea placeholder="Notatki" value={editingGuest.notes || ""} onChange={(e) => setEditingGuest({ ...editingGuest, notes: e.target.value })} className="border p-2 rounded col-span-2" />
    </div>
    <div className="mt-4 flex justify-end gap-2">
      <button onClick={() => setEditingGuest(null)} className="px-3 py-2 border rounded">Anuluj</button>
      <button onClick={handleSaveEdit} className="bg-blue-600 text-white px-3 py-2 rounded">Zapisz</button>
    </div>
  </Modal>
)}


      {/* === MODAL: Edycja podgościa === */}
{editingSubGuest && (
  <Modal onClose={() => setEditingSubGuest(null)} title="Edytuj dane podgościa">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <input placeholder="Imię" value={editingSubGuest.sub.first_name} onChange={(e) => setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, first_name: e.target.value } })} className="border p-2 rounded" />
      <input placeholder="Nazwisko" value={editingSubGuest.sub.last_name} onChange={(e) => setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, last_name: e.target.value } })} className="border p-2 rounded" />
      
      <select value={editingSubGuest.sub.relation || ""} onChange={(e) => setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, relation: e.target.value } })} className="border p-2 rounded">
        <option value="">Relacja</option>
        <option value="dziadkowie">Dziadkowie</option>
        <option value="wujostwo">Wujostwo</option>
        <option value="kuzynostwo">Kuzynostwo</option>
        <option value="przyjaciele">Przyjaciele</option>
        <option value="znajomi">Znajomi</option>
        <option value="praca">Praca</option>
      </select>

      <select value={editingSubGuest.sub.side || ""} onChange={(e) => setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, side: e.target.value } })} className="border p-2 rounded">
        <option value="">Strona</option>
        <option value="Pani młodej">Pani młodej</option>
        <option value="Pana młodego">Pana młodego</option>
      </select>

      <select value={editingSubGuest.sub.rsvp || ""} onChange={(e) => setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, rsvp: e.target.value } })} className="border p-2 rounded">
        <option value="">RSVP</option>
        <option value="Potwierdzone">Potwierdzone</option>
        <option value="Odmowa">Odmowa</option>
        <option value="Nieznane">Nieznane</option>
      </select>

      <textarea placeholder="Alergeny" value={editingSubGuest.sub.allergens || ""} onChange={(e) => setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, allergens: e.target.value } })} className="border p-2 rounded col-span-2" />
      <textarea placeholder="Notatki" value={editingSubGuest.sub.notes || ""} onChange={(e) => setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, notes: e.target.value } })} className="border p-2 rounded col-span-2" />
    </div>
    <div className="mt-4 flex justify-end gap-2">
      <button onClick={() => setEditingSubGuest(null)} className="px-3 py-2 border rounded">Anuluj</button>
      <button onClick={handleSaveSubEdit} className="bg-blue-600 text-white px-3 py-2 rounded">Zapisz</button>
    </div>
  </Modal>
)}

{confirmModal.open && (
  <Modal onClose={() => setConfirmModal({ open: false, message: "" })} title="Potwierdzenie">
    <p className="mb-4">{confirmModal.message}</p>
    <div className="flex justify-end gap-2">
      <button
        onClick={() => setConfirmModal({ open: false, message: "" })}
        className="px-3 py-2 border rounded"
      >
        Anuluj
      </button>
      <button
        onClick={() => {
          confirmModal.onConfirm?.();
          setConfirmModal({ open: false, message: "" });
        }}
        className="bg-red-600 text-white px-3 py-2 rounded"
      >
        Usuń
      </button>
    </div>
  </Modal>
)}


    </div>
  );
};

export default Guests;

