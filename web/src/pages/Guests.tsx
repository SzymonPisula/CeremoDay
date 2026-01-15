// web/src/pages/Guests.tsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { Guest, GuestPayload } from "../types/guest";
import Select from "../ui/Select";
import { Users, UserPlus, Download, Phone, Mail, ChevronRight, FileUp } from "lucide-react";
import GuestsImportModal from "../components/guests/GuestsImportModal";



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
      <div onClick={onClose} className="absolute inset-0 cursor-pointer" style={{ background: "transparent" }} />

      {/* zawartość */}
      <div
        className="relative w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh] animate-fadeIn rounded-2xl shadow-2xl border border-white/10 bg-emerald-950/70 text-white backdrop-blur-xl"
        style={{
          zIndex: 10000000,
          position: "relative",
        }}
      >
        {title && <h3 className="text-xl font-semibold mb-4 text-center text-white">{title}</h3>}
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
  const [showImportModal, setShowImportModal] = useState(false);

  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showAddSubGuestModal, setShowAddSubGuestModal] = useState<{ open: boolean; parentId?: string }>({
    open: false,
  });

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

  // UI helpers (spójny „CRM vibe” w całej aplikacji)
  const inputBase =
    "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/35 outline-none focus:border-[#c8a04b]/50 focus:ring-2 focus:ring-[#c8a04b]/15 transition";
  const textareaBase = inputBase + " min-h-[96px]";

  const btnSecondary =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
    "bg-white/5 text-white border border-white/10 " +
    "hover:bg-white/10 hover:border-white/15 " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/40 " +
    "transition";

  const btnGold =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " +
    "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
    "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
    "hover:brightness-105 active:translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/45 " +
    "transition";

  const chip =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full " +
    "border border-white/10 bg-white/5 text-white/80 text-xs";

  const RELATION_OPTIONS = [
    { value: "dziadkowie", label: "Dziadkowie" },
    { value: "wujostwo", label: "Wujostwo" },
    { value: "kuzynostwo", label: "Kuzynostwo" },
    { value: "przyjaciele", label: "Przyjaciele" },
    { value: "znajomi", label: "Znajomi" },
    { value: "praca", label: "Praca" },
  ] as const;

  const SIDE_OPTIONS = [
    { value: "pani_mlodej", label: "Pani młodej" },
    { value: "pana_mlodego", label: "Pana młodego" },
  ] as const;

  const RSVP_OPTIONS = [
    { value: "confirmed", label: "Potwierdzone" },
    { value: "declined", label: "Odmowa" },
    { value: "unknown", label: "Nieznane" },
  ] as const;


type GuestListStatus = "READY" | "PARTIAL" | "NOT_STARTED";

const [guestListStatus, setGuestListStatus] = useState<GuestListStatus | null>(null);
const [interviewLoading, setInterviewLoading] = useState(false);



useEffect(() => {
  if (!eventId) return;

  let ignore = false;

  const fetchInterviewStatus = async () => {
    try {
      setInterviewLoading(true);

      // api.getInterview już masz w projekcie (używasz w Documents)
      const data = (await api.getInterview(eventId)) as { guest_list_status?: string } | null;

      if (ignore) return;

      const raw = (data?.guest_list_status ?? "").toUpperCase();
      const normalized =
        raw === "READY" || raw === "PARTIAL" || raw === "NOT_STARTED"
          ? (raw as GuestListStatus)
          : "NOT_STARTED";

      setGuestListStatus(normalized);
    } catch {
      // jak coś pójdzie nie tak — zachowujemy bezpiecznie: nie pokazujemy importu
      if (!ignore) setGuestListStatus("NOT_STARTED");
    } finally {
      if (!ignore) setInterviewLoading(false);
    }
  };

  void fetchInterviewStatus();

  return () => {
    ignore = true;
  };
}, [eventId]);

const canImport = guestListStatus === "READY" || guestListStatus === "PARTIAL";



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
          Typ: "Współgość",
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
      const payload = { ...guestForm, event_id: eventId };
const newGuest = await api.createGuest(payload);

// ✅ merge: zachowujemy relation/side/rsvp jeśli API nie zwraca
const fullGuest: Guest = { ...newGuest, ...payload };



setGuests((prev) => [...prev, fullGuest]);

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
      const fullSub = { ...newSub, ...subGuestForm };
      setGuests((prev) =>
        prev.map((g) =>
          g.id === showAddSubGuestModal.parentId ? { ...g, SubGuests: [...(g.SubGuests || []), fullSub] } : g
        )
      );

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

  // ✅ działa i dla gościa głównego i dla subgościa
  const handleDeleteGuest = (id: string) => {
    setConfirmModal({
      open: true,
      message: "Czy na pewno chcesz usunąć tego gościa?",
      onConfirm: async () => {
        try {
          await api.deleteGuest(id);

          setGuests((prev) =>
            prev
              // usuń subgościa w każdym rodzicu
              .map((g) => ({ ...g, SubGuests: (g.SubGuests || []).filter((s) => s.id !== id) }))
              // usuń gościa głównego
              .filter((g) => g.id !== id)
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
      const payload = editingGuest;
const updated = await api.updateGuest(payload.id!, payload);

if (updated?.id) {
  // ✅ merge: payload ma wszystkie pola, updated może być okrojony
  const fullUpdated: Guest = { ...payload, ...updated };

  setGuests((prev) =>
    prev.map((g) => (g.id === fullUpdated.id ? { ...fullUpdated, SubGuests: g.SubGuests } : g))
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
        const fullUpdated = { ...updated, ...editingSubGuest.sub };
        setGuests((prev) =>
          prev.map((g) =>
            g.id === editingSubGuest.parentId
              ? { ...g, SubGuests: g.SubGuests?.map((s) => (s.id === fullUpdated.id ? fullUpdated : s)) }
              : g
          )
        );
      }
      setEditingSubGuest(null);
    } catch (err) {
      console.error(err);
    }
  };

  type RelationKey = (typeof RELATION_OPTIONS)[number]["value"];
  type SideKey = (typeof SIDE_OPTIONS)[number]["value"];
  type RsvpKey = (typeof RSVP_OPTIONS)[number]["value"];

  const byValue = <T extends string>(opts: ReadonlyArray<{ value: T; label: string }>, v?: string) => {
    if (!v) return "—";
    const a = opts.find((o) => o.value === (v as T));
    if (a) return a.label;

    const b = opts.find((o) => o.label.toLowerCase() === v.toLowerCase());
    if (b) return b.label;

    const legacy: Record<string, string> = {
      "Pani młodej": "Pani młodej",
      "Pana młodego": "Pana młodego",
      Potwierdzone: "Potwierdzone",
      Odmowa: "Odmowa",
      Nieznane: "Nieznane",
    };
    return legacy[v] ?? v;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ✅ HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#d7b45a]" />
          </div>

          <div>
            <h2 className="text-3xl font-semibold text-white leading-tight">Goście</h2>
            <div className="text-sm text-white/55 mt-1">
              {guests.length} osób • zarządzaj RSVP, relacjami i podgośćmi
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowAddGuestModal(true)} className={btnGold}>
            <UserPlus className="h-4 w-4" />
            Dodaj gościa
          </button>
          
          
          {!interviewLoading && canImport ? (
            <button onClick={() => setShowImportModal(true)} className={btnSecondary}>
              <Download  className="h-4 w-4 text-[#d7b45a]" />
              Importuj
            </button>
          ) : null}



          <button onClick={handleExportExcel} className={btnSecondary}>
            <FileUp  className="h-4 w-4 text-[#d7b45a]" />
            Eksportuj
          </button>
        </div>
      </div>

      {guests.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
          Brak gości
        </div>
      ) : (
        <ol className="list-decimal pl-5 space-y-4">
          {guests.map((guest) => (
            <li
              key={guest.id}
              className={
                "p-6 md:p-7 mb-6 relative " +
                "rounded-2xl border border-white/10 " +
                "bg-emerald-950/35 backdrop-blur-xl " +
                "shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
              }
            >
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-xl text-white leading-snug">
                    {guest.first_name} {guest.last_name}
                  </p>

                  {/* ✅ kontakt bez emoji */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
                    <div className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4 text-white/45" />
                      <span className="text-white/80">{guest.phone || "—"}</span>
                    </div>

                    <div className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4 text-white/45" />
                      <span className="text-white/80">{guest.email || "—"}</span>
                    </div>
                  </div>

                  {/* ✅ chipy */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={chip}>Relacja: {byValue(RELATION_OPTIONS, guest.relation)}</span>
                    <span className={chip}>Strona: {byValue(SIDE_OPTIONS, guest.side)}</span>
                    <span className={chip}>RSVP: {byValue(RSVP_OPTIONS, guest.rsvp)}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wider text-white/55">Alergeny</div>
                      <div className="text-sm text-white/85">{guest.allergens || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wider text-white/55">Notatki</div>
                      <div className="text-sm text-white/85">{guest.notes || "—"}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setEditingGuest(guest)} className={btnSecondary}>
                    Edytuj
                  </button>

                  <button
                    onClick={() => handleDeleteGuest(guest.id!)}
                    className={
                      "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " +
                      "bg-red-500/15 text-red-200 border border-red-400/25 " +
                      "hover:bg-red-500/20 hover:border-red-400/35 " +
                      "focus:outline-none focus:ring-2 focus:ring-red-400/30 transition"
                    }
                  >
                    Usuń
                  </button>

                  <button
                    onClick={() => setShowAddSubGuestModal({ open: true, parentId: guest.id! })}
                    className={btnGold}
                  >
                    + Współgość
                  </button>
                </div>
              </div>

              {/* ✅ SUBGOŚCIE */}
              <ol className="pl-6 mt-4 space-y-2 border-l border-white/10 list-decimal">
                {(guest.SubGuests || []).map((sg) => (
                  <li
                    key={sg.id}
                    className="mt-4 p-5 rounded-2xl border border-white/10 bg-white/4 backdrop-blur"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-white/35" />
                          <p className="font-semibold text-white/90">
                            {sg.first_name} {sg.last_name}
                          </p>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={chip}>RSVP: {byValue(RSVP_OPTIONS, sg.rsvp)}</span>
                          <span className={chip}>Alergeny: {sg.allergens || "—"}</span>
                        </div>

                        {sg.notes ? <p className="mt-2 text-sm text-white/80 italic">{sg.notes}</p> : null}
                      </div>

                      {/* ✅ poprawione akcje subgościa */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setEditingSubGuest({ parentId: guest.id!, sub: sg })}
                          className={btnSecondary}
                        >
                          Edytuj
                        </button>

                        <button
                          onClick={() => handleDeleteGuest(sg.id!)}
                          className={
                            "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " +
                            "bg-red-500/15 text-red-200 border border-red-400/25 " +
                            "hover:bg-red-500/20 hover:border-red-400/35 " +
                            "focus:outline-none focus:ring-2 focus:ring-red-400/30 transition"
                          }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Imię"
              value={guestForm.first_name}
              onChange={(e) => setGuestForm({ ...guestForm, first_name: e.target.value })}
              className={inputBase}
            />
            <input
              placeholder="Nazwisko"
              value={guestForm.last_name}
              onChange={(e) => setGuestForm({ ...guestForm, last_name: e.target.value })}
              className={inputBase}
            />
            <input
              placeholder="Telefon"
              value={guestForm.phone || ""}
              onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
              className={inputBase}
            />
            <input
              placeholder="Email"
              value={guestForm.email || ""}
              onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
              className={inputBase}
            />

            <Select
              label="Relacja"
              value={(guestForm.relation as RelationKey) || ""}
              onChange={(v) => setGuestForm({ ...guestForm, relation: v })}
              options={RELATION_OPTIONS}
            />

            <Select
              label="Strona"
              value={(guestForm.side as SideKey) || ""}
              onChange={(v) => setGuestForm({ ...guestForm, side: v })}
              options={SIDE_OPTIONS}
            />

            <Select
              label="RSVP"
              value={(guestForm.rsvp as RsvpKey) || ""}
              onChange={(v) => setGuestForm({ ...guestForm, rsvp: v })}
              options={RSVP_OPTIONS}
            />

            <textarea
              placeholder="Alergeny"
              value={guestForm.allergens || ""}
              onChange={(e) => setGuestForm({ ...guestForm, allergens: e.target.value })}
              className={`${textareaBase} md:col-span-2`}
            />
            <textarea
              placeholder="Notatki"
              value={guestForm.notes || ""}
              onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
              className={`${textareaBase} md:col-span-2`}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowAddGuestModal(false)} className={btnSecondary}>
              Anuluj
            </button>
            <button onClick={handleAddGuest} className={btnGold}>
              Dodaj
            </button>
          </div>
        </Modal>
      )}

      {/* === MODAL: Dodaj współgościa === */}
      {showAddSubGuestModal.open && (
        <Modal onClose={() => setShowAddSubGuestModal({ open: false })} title="Dodaj współgościa">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Imię"
              value={subGuestForm.first_name}
              onChange={(e) => setSubGuestForm({ ...subGuestForm, first_name: e.target.value })}
              className={inputBase}
            />
            <input
              placeholder="Nazwisko"
              value={subGuestForm.last_name}
              onChange={(e) => setSubGuestForm({ ...subGuestForm, last_name: e.target.value })}
              className={inputBase}
            />

            <Select
              label="Relacja"
              value={(subGuestForm.relation as RelationKey) || ""}
              onChange={(v) => setSubGuestForm({ ...subGuestForm, relation: v })}
              options={RELATION_OPTIONS}
            />

            <Select
              label="Strona"
              value={(subGuestForm.side as SideKey) || ""}
              onChange={(v) => setSubGuestForm({ ...subGuestForm, side: v })}
              options={SIDE_OPTIONS}
            />

            <Select
              label="RSVP"
              value={(subGuestForm.rsvp as RsvpKey) || ""}
              onChange={(v) => setSubGuestForm({ ...subGuestForm, rsvp: v })}
              options={RSVP_OPTIONS}
            />

            <textarea
              placeholder="Alergeny"
              value={subGuestForm.allergens || ""}
              onChange={(e) => setSubGuestForm({ ...subGuestForm, allergens: e.target.value })}
              className={`${textareaBase} md:col-span-2`}
            />
            <textarea
              placeholder="Notatki"
              value={subGuestForm.notes || ""}
              onChange={(e) => setSubGuestForm({ ...subGuestForm, notes: e.target.value })}
              className={`${textareaBase} md:col-span-2`}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowAddSubGuestModal({ open: false })} className={btnSecondary}>
              Anuluj
            </button>
            <button onClick={handleAddSubGuest} className={btnGold}>
              Dodaj
            </button>
          </div>
        </Modal>
      )}

      {/* === MODAL: Edycja gościa === */}
      {editingGuest && (
        <Modal onClose={() => setEditingGuest(null)} title="Edytuj dane gościa">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Imię"
              value={editingGuest.first_name}
              onChange={(e) => setEditingGuest({ ...editingGuest, first_name: e.target.value })}
              className={inputBase}
            />
            <input
              placeholder="Nazwisko"
              value={editingGuest.last_name}
              onChange={(e) => setEditingGuest({ ...editingGuest, last_name: e.target.value })}
              className={inputBase}
            />
            <input
              placeholder="Telefon"
              value={editingGuest.phone || ""}
              onChange={(e) => setEditingGuest({ ...editingGuest, phone: e.target.value })}
              className={inputBase}
            />
            <input
              placeholder="Email"
              value={editingGuest.email || ""}
              onChange={(e) => setEditingGuest({ ...editingGuest, email: e.target.value })}
              className={inputBase}
            />

            <Select
              label="Relacja"
              value={(editingGuest.relation as RelationKey) || ""}
              onChange={(v) => setEditingGuest({ ...editingGuest, relation: v })}
              options={RELATION_OPTIONS}
            />

            <Select
              label="Strona"
              value={(editingGuest.side as SideKey) || ""}
              onChange={(v) => setEditingGuest({ ...editingGuest, side: v })}
              options={SIDE_OPTIONS}
            />

            <Select
              label="RSVP"
              value={(editingGuest.rsvp as RsvpKey) || ""}
              onChange={(v) => setEditingGuest({ ...editingGuest, rsvp: v })}
              options={RSVP_OPTIONS}
            />

            <textarea
              placeholder="Alergeny"
              value={editingGuest.allergens || ""}
              onChange={(e) => setEditingGuest({ ...editingGuest, allergens: e.target.value })}
              className={`${textareaBase} md:col-span-2`}
            />
            <textarea
              placeholder="Notatki"
              value={editingGuest.notes || ""}
              onChange={(e) => setEditingGuest({ ...editingGuest, notes: e.target.value })}
              className={`${textareaBase} md:col-span-2`}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setEditingGuest(null)}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            >
              Anuluj
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 rounded-xl bg-[#c8a04b] text-black font-medium hover:brightness-105"
            >
              Zapisz
            </button>
          </div>
        </Modal>
      )}

      {/* === MODAL: Edycja współgościa === */}
      {editingSubGuest && (
        <Modal onClose={() => setEditingSubGuest(null)} title="Edytuj dane współgościa">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Imię"
              value={editingSubGuest.sub.first_name}
              onChange={(e) =>
                setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, first_name: e.target.value } })
              }
              className={inputBase}
            />
            <input
              placeholder="Nazwisko"
              value={editingSubGuest.sub.last_name}
              onChange={(e) =>
                setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, last_name: e.target.value } })
              }
              className={inputBase}
            />

            <Select
              label="Relacja"
              value={(editingSubGuest.sub.relation as RelationKey) || ""}
              onChange={(v) =>
                setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, relation: v } })
              }
              options={RELATION_OPTIONS}
            />

            <Select
              label="Strona"
              value={(editingSubGuest.sub.side as SideKey) || ""}
              onChange={(v) => setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, side: v } })}
              options={SIDE_OPTIONS}
            />

            <Select
              label="RSVP"
              value={(editingSubGuest.sub.rsvp as RsvpKey) || ""}
              onChange={(v) => setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, rsvp: v } })}
              options={RSVP_OPTIONS}
            />

            <textarea
              placeholder="Alergeny"
              value={editingSubGuest.sub.allergens || ""}
              onChange={(e) =>
                setEditingSubGuest({
                  ...editingSubGuest,
                  sub: { ...editingSubGuest.sub, allergens: e.target.value },
                })
              }
              className={`${textareaBase} md:col-span-2`}
            />
            <textarea
              placeholder="Notatki"
              value={editingSubGuest.sub.notes || ""}
              onChange={(e) =>
                setEditingSubGuest({
                  ...editingSubGuest,
                  sub: { ...editingSubGuest.sub, notes: e.target.value },
                })
              }
              className={`${textareaBase} md:col-span-2`}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setEditingSubGuest(null)}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            >
              Anuluj
            </button>
            <button
              onClick={handleSaveSubEdit}
              className="px-4 py-2 rounded-xl bg-[#c8a04b] text-black font-medium hover:brightness-105"
            >
              Zapisz
            </button>
          </div>
        </Modal>
      )}

      {/* === MODAL: Potwierdzenie === */}
      {confirmModal.open && (
        <Modal onClose={() => setConfirmModal({ open: false, message: "" })} title="Potwierdzenie">
          <p className="mb-4 text-white/80">{confirmModal.message}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmModal({ open: false, message: "" })}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            >
              Anuluj
            </button>
            <button
              onClick={() => {
                confirmModal.onConfirm?.();
                setConfirmModal({ open: false, message: "" });
              }}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:brightness-105"
            >
              Usuń
            </button>
          </div>
        </Modal>
      )}
      <GuestsImportModal
  open={showImportModal}
  onClose={() => setShowImportModal(false)}
  onImport={async (items) => {
    if (!eventId) return;
    await api.importGuests(eventId, items);

    // po imporcie odśwież listę
    const data = await api.getGuests(eventId);
    setGuests(data);
  }}
/>
    </div>
  );
};



export default Guests;
