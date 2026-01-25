import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { Guest, GuestPayload } from "../types/guest";
import Select from "../ui/Select";
import { Users, UserPlus, Download, Phone, Mail, ChevronRight, FileUp } from "lucide-react";
import GuestsImportModal from "../components/guests/GuestsImportModal";
import { useFormErrors } from "../ui/useFormErrors";
import FieldError from "../ui/FieldError";
import ErrorMessage from "../ui/ErrorMessage";

type ApiErrorLike = {
  status?: number;
  message?: string;
  fields?: Record<string, string>;
};

// -----------------------------
// Modal (z blokadą scrolla)
// -----------------------------
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
        style={{ zIndex: 10000000, position: "relative" }}
      >
        {title && <h3 className="text-xl font-semibold mb-4 text-center text-white">{title}</h3>}
        {children}
      </div>
    </div>,
    modalRoot
  );
};

// -----------------------------
// Helpers
// -----------------------------
function toNull(v: unknown) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function normalizeGuestPayload(p: GuestPayload, eventId: string): GuestPayload {
  return {
    ...p,
    event_id: eventId,
    first_name: String(p.first_name ?? "").trim(),
    last_name: String(p.last_name ?? "").trim(),
    phone: toNull(p.phone),
    email: toNull(p.email),
    relation: toNull(p.relation),
    side: toNull(p.side),
    rsvp: toNull(p.rsvp),
    allergens: toNull(p.allergens),
    notes: toNull(p.notes),
    parent_guest_id: toNull(p.parent_guest_id),
  } as GuestPayload;
}

function buildFriendlyError(err: unknown, fallback: string) {
  const e = err as ApiErrorLike;

  const global = e?.fields?._global;
  if (typeof global === "string" && global.trim().length) return global;

  if (typeof e?.message === "string" && e.message.trim().length) return e.message;

  return fallback;
}

// --- Walidacja + blokowanie wpisywania ---
function isValidEmailSimple(v: string) {
  const s = v.trim();
  if (!s) return true; // email opcjonalny
  const at = s.indexOf("@");
  if (at <= 0) return false;
  const dot = s.indexOf(".", at + 2);
  if (dot === -1) return false;
  if (dot === s.length - 1) return false;
  return true;
}

// litery PL + spacje + myślnik
const NAME_ALLOWED_RE = /^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s-]+$/;

function capitalizeName(value: string) {
  return value
    .split(" ")
    .map((part) =>
      part
        .split("-")
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
        .join("-")
    )
    .join(" ");
}

function sanitizeNameInput(next: string) {
  let s = next.replace(/[^A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s-]/g, "");
  s = s.replace(/\s+/g, " ");
  s = s.replace(/-+/g, "-");
  return capitalizeName(s);
}

function isValidNameValue(value: string) {
  const s = value.trim();
  if (!s) return false;
  if (!NAME_ALLOWED_RE.test(s)) return false;
  if (s.startsWith("-") || s.endsWith("-")) return false;
  if (s.includes("--")) return false;
  return true;
}

function sanitizePhoneInput(next: string) {
  return next.replace(/\D/g, "").slice(0, 9);
}

function isValidPhone9(value: string) {
  return /^\d{9}$/.test(value.trim());
}

type GuestListStatus = "READY" | "PARTIAL" | "NOT_STARTED";
type GuestFormState = Omit<GuestPayload, "event_id">;

// -----------------------------
// Page
// -----------------------------
const Guests: React.FC = () => {
  const params = useParams();
  const eventIdRaw =
    (params as Record<string, string | undefined>)?.id ?? (params as Record<string, string | undefined>)?.eventId;
  const eventId = typeof eventIdRaw === "string" ? eventIdRaw.trim() : "";

  // twarda walidacja - bo czasem zdarza się "undefined" jako string
  const hasValidEventId = !!eventId && eventId !== "undefined" && eventId !== "null" && eventId.length >= 6;

  // Walidacje formularzy w modalach (backend -> pola)
  const guestModalForm = useFormErrors();
  const subGuestModalForm = useFormErrors();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editingSubGuest, setEditingSubGuest] = useState<{ parentId: string; sub: Guest } | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showAddSubGuestModal, setShowAddSubGuestModal] = useState<{ open: boolean; parentId?: string }>({
    open: false,
  });

  // ✅ confirm (wymuszenie checkboxa dla osoby kontaktowej z podgośćmi)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    message: string;
    guestId?: string;
    isContactPerson?: boolean;
    hasSubGuests?: boolean;
  }>({ open: false, message: "" });

  const [confirmCascadeChecked, setConfirmCascadeChecked] = useState(false);

  const [guestForm, setGuestForm] = useState<GuestFormState>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    relation: "",
    side: "",
    rsvp: "",
    allergens: "",
    notes: "",
    parent_guest_id: "",
  });

  const [subGuestForm, setSubGuestForm] = useState<GuestFormState>({
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

  // UI helpers (spójny „CRM vibe”)
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
    { value: "rodzina", label: "Rodzina" },
    { value: "przyjaciele", label: "Przyjaciele" },
    { value: "znajomi", label: "Znajomi" },
    { value: "praca", label: "Praca" },
    { value: "uslugodawcy", label: "Usługodawcy" },
    { value: "inna", label: "Inna" },
  ] as const;

  const SIDE_OPTIONS = [
    { value: "pani_mlodej", label: "Pani młodej" },
    { value: "pana_mlodego", label: "Pana młodego" },
    { value: "wspolna", label: "Wspólna" },
  ] as const;

  const RSVP_OPTIONS = [
    { value: "confirmed", label: "Potwierdzone" },
    { value: "declined", label: "Odmowa" },
    { value: "unknown", label: "Nieznane" },
  ] as const;

  type RelationKey = (typeof RELATION_OPTIONS)[number]["value"];
  type SideKey = (typeof SIDE_OPTIONS)[number]["value"];
  type RsvpKey = (typeof RSVP_OPTIONS)[number]["value"];

  const byValue = <T extends string>(opts: ReadonlyArray<{ value: T; label: string }>, v?: string | null) => {
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

  // -------------------------
  // Interview -> czy import widoczny
  // -------------------------
  const [guestListStatus, setGuestListStatus] = useState<GuestListStatus | null>(null);
  const [interviewLoading, setInterviewLoading] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    let ignore = false;
    const fetchInterviewStatus = async () => {
      try {
        setInterviewLoading(true);
        const data = (await api.getInterview(eventId)) as { guest_list_status?: string } | null;
        if (ignore) return;

        const raw = (data?.guest_list_status ?? "").toUpperCase();
        const normalized =
          raw === "READY" || raw === "PARTIAL" || raw === "NOT_STARTED"
            ? (raw as GuestListStatus)
            : "NOT_STARTED";

        setGuestListStatus(normalized);
      } catch {
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

  // -------------------------
  // Lista gości
  // -------------------------
  useEffect(() => {
    if (!eventId) return;
    let ignore = false;

    const fetchGuests = async () => {
      try {
        setListError(null);
        setListLoading(true);
        const data = await api.getGuests(eventId);
        if (!ignore) setGuests(data);
      } catch (e: unknown) {
        if (!ignore) setListError(buildFriendlyError(e, "Nie udało się pobrać listy gości."));
      } finally {
        if (!ignore) setListLoading(false);
      }
    };

    void fetchGuests();
    return () => {
      ignore = true;
    };
  }, [eventId]);

  // -------------------------
  // Export
  // -------------------------
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
          "Osoba kontaktowa": `${g.first_name} ${g.last_name}`,
        })
      );
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Goście");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "goscie.xlsx");
  };

  // -------------------------
  // Guard: brak eventId
  // -------------------------
  if (!hasValidEventId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
          <div className="text-lg font-semibold mb-1">Brak identyfikatora wydarzenia</div>
          <div className="text-sm text-red-100/80">
            Ta strona musi być otwarta jako <span className="font-mono">/event/:id/guests</span> (albo{" "}
            <span className="font-mono">/event/:eventId/guests</span>).<br />
            Aktualnie parametr jest pusty / niepoprawny, więc nie da się dodać gości.
          </div>
        </div>
      </div>
    );
  }

  // -------------------------
  // Walidacja lokalna (pełna)
  // -------------------------
  const validateGuestFormLocal = (f: GuestFormState) => {
    const errors: Record<string, string> = {};

    const fn = String(f.first_name ?? "").trim();
    const ln = String(f.last_name ?? "").trim();
    const ph = String(f.phone ?? "").trim();
    const em = String(f.email ?? "").trim();

    if (!fn) errors.first_name = "Imię jest wymagane.";
    else if (!isValidNameValue(fn)) errors.first_name = "Imię może zawierać tylko litery oraz spacje.";

    if (!ln) errors.last_name = "Nazwisko jest wymagane.";
    else if (!isValidNameValue(ln)) errors.last_name = "Nazwisko może zawierać tylko litery, spacje i myślnik.";

    if (!ph) errors.phone = "Telefon jest wymagany.";
    else if (!isValidPhone9(ph)) errors.phone = "Telefon musi mieć dokładnie 9 cyfr.";

    if (em && !isValidEmailSimple(em)) errors.email = "Email musi zawierać „@” i kropkę po „@” (np. a@b.pl).";

    return errors;
  };

  // -------------------------
  // CRUD: Add guest
  // -------------------------
  const handleAddGuest = async () => {
    if (!hasValidEventId) {
      guestModalForm.setFormError(
        "Brak identyfikatora wydarzenia. Wejdź na stronę z poziomu wydarzenia (Dashboard → Goście)."
      );
      return;
    }

    guestModalForm.clear();

    const errors = validateGuestFormLocal(guestForm);
    if (Object.keys(errors).length) {
      guestModalForm.setFieldErrors(errors);
      guestModalForm.setFormError("Popraw zaznaczone pola w formularzu.");
      return;
    }

    try {
      const payload = normalizeGuestPayload(
        {
          ...guestForm,
          event_id: eventId,
        } as GuestPayload,
        eventId
      );

      const newGuest = await api.createGuest(payload);
      const fullGuest: Guest = { ...newGuest, ...payload };
      setGuests((prev) => [...prev, fullGuest]);

      setGuestForm({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        relation: "",
        side: "",
        rsvp: "",
        allergens: "",
        notes: "",
        parent_guest_id: "",
      });

      setShowAddGuestModal(false);
    } catch (err: unknown) {
      guestModalForm.setFromApiError(err, "Nie udało się dodać gościa.");
    }
  };

  // -------------------------
  // CRUD: Add sub-guest
  // -------------------------
  const handleAddSubGuest = async () => {
    if (!eventId) return;
    if (!showAddSubGuestModal.parentId) return;

    subGuestModalForm.clear();

    const parentId = showAddSubGuestModal.parentId;
    const parent = guests.find((g) => g.id === parentId) || null;

    const errors: Record<string, string> = {};
    const fn = String(subGuestForm.first_name ?? "").trim();
    const ln = String(subGuestForm.last_name ?? "").trim();

    if (!fn) errors.first_name = "Imię jest wymagane.";
    else if (!isValidNameValue(fn)) errors.first_name = "Imię może zawierać tylko litery oraz spacje.";

    if (!ln) errors.last_name = "Nazwisko jest wymagane.";
    else if (!isValidNameValue(ln)) errors.last_name = "Nazwisko może zawierać tylko litery, spacje i myślnik.";

    if (Object.keys(errors).length) {
      subGuestModalForm.setFieldErrors(errors);
      subGuestModalForm.setFormError("Popraw zaznaczone pola w formularzu.");
      return;
    }

    try {
      const payload = normalizeGuestPayload(
        {
          ...subGuestForm,
          event_id: eventId,
          parent_guest_id: parentId,
          phone: "",
          email: "",
          relation: parent?.relation ?? subGuestForm.relation,
          side: parent?.side ?? subGuestForm.side,
        } as GuestPayload,
        eventId
      );

      const newSub = await api.createGuest(payload);
      const fullSub = { ...newSub, ...payload };

      setGuests((prev) =>
        prev.map((g) => (g.id === parentId ? { ...g, SubGuests: [...(g.SubGuests || []), fullSub] } : g))
      );

      setSubGuestForm({
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
    } catch (err: unknown) {
      subGuestModalForm.setFromApiError(err, buildFriendlyError(err, "Nie udało się zapisać współgościa."));
    }
  };

  // -------------------------
  // Delete (ask + run)
  // -------------------------
  const handleDeleteGuestAsk = (g: Guest) => {
    const isContactPerson = !g.parent_guest_id; // osoba kontaktowa = gość główny
    const hasSubGuests = (g.SubGuests || []).length > 0;

    setConfirmCascadeChecked(false);

    setConfirmModal({
      open: true,
      guestId: g.id!,
      isContactPerson,
      hasSubGuests,
      message: isContactPerson
        ? `Czy na pewno chcesz usunąć osobę kontaktową "${g.first_name} ${g.last_name}"?`
        : `Czy na pewno chcesz usunąć współgościa "${g.first_name} ${g.last_name}"?`,
    });
  };

  const runDelete = async () => {
    const id = confirmModal.guestId;
    if (!id) return;

    const cascadeRequired = !!confirmModal.isContactPerson && !!confirmModal.hasSubGuests;

    // jeśli osoba kontaktowa ma współgości -> wymagamy checkboxa
    if (cascadeRequired && !confirmCascadeChecked) return;

    try {
      await api.deleteGuest(id, { cascade: cascadeRequired ? true : false });

      setGuests((prev) => {
        // 1) usuń z list SubGuests (na wypadek usuwania współgościa)
        const removedFromSubs = prev.map((p) => ({
          ...p,
          SubGuests: (p.SubGuests || []).filter((s) => s.id !== id),
        }));

        // 2) usuń rekord główny (osoba kontaktowa lub top-level jeśli backend tak zwraca)
        return removedFromSubs.filter((p) => p.id !== id);
      });
    } catch (err: unknown) {
      console.error(buildFriendlyError(err, "Nie udało się usunąć gościa."));
    } finally {
      setConfirmModal({ open: false, message: "" });
      setConfirmCascadeChecked(false);
    }
  };

  // -------------------------
  // Save edit: guest
  // -------------------------
  const handleSaveEdit = async () => {
    if (!eventId) return;
    if (!editingGuest?.id) return;

    guestModalForm.clear();

    const errors = validateGuestFormLocal({
      first_name: editingGuest.first_name ?? "",
      last_name: editingGuest.last_name ?? "",
      phone: editingGuest.phone ?? "",
      email: editingGuest.email ?? "",
      relation: editingGuest.relation ?? "",
      side: editingGuest.side ?? "",
      rsvp: editingGuest.rsvp ?? "",
      allergens: editingGuest.allergens ?? "",
      notes: editingGuest.notes ?? "",
      parent_guest_id: editingGuest.parent_guest_id ?? "",
    });

    if (Object.keys(errors).length) {
      guestModalForm.setFieldErrors(errors);
      guestModalForm.setFormError("Popraw zaznaczone pola w formularzu.");
      return;
    }

    try {
      const payload = normalizeGuestPayload(
        {
          ...editingGuest,
          event_id: eventId,
        } as GuestPayload,
        eventId
      );

      const updated = await api.updateGuest(payload.id!, payload);

      const fullUpdated: Guest = { ...payload, ...updated };
      setGuests((prev) => prev.map((g) => (g.id === fullUpdated.id ? { ...fullUpdated, SubGuests: g.SubGuests } : g)));

      setEditingGuest(null);
    } catch (err: unknown) {
      guestModalForm.setFromApiError(err, buildFriendlyError(err, "Nie udało się zapisać zmian."));
    }
  };

  // -------------------------
  // Save edit: sub-guest
  // -------------------------
  const handleSaveSubEdit = async () => {
    if (!eventId) return;
    if (!editingSubGuest) return;

    const parent = guests.find((g) => g.id === editingSubGuest.parentId) || null;
    const subId = editingSubGuest.sub.id;
    if (!subId) {
      subGuestModalForm.setFormError("Brak identyfikatora współgościa. Odśwież stronę.");
      return;
    }

    subGuestModalForm.clear();

    const errors: Record<string, string> = {};
    const fn = String(editingSubGuest.sub.first_name ?? "").trim();
    const ln = String(editingSubGuest.sub.last_name ?? "").trim();

    if (!fn) errors.first_name = "Imię jest wymagane.";
    else if (!isValidNameValue(fn)) errors.first_name = "Imię może zawierać tylko litery oraz spacje.";

    if (!ln) errors.last_name = "Nazwisko jest wymagane.";
    else if (!isValidNameValue(ln)) errors.last_name = "Nazwisko może zawierać tylko litery, spacje i myślnik.";

    if (Object.keys(errors).length) {
      subGuestModalForm.setFieldErrors(errors);
      subGuestModalForm.setFormError("Popraw zaznaczone pola w formularzu.");
      return;
    }

    try {
      const payload = normalizeGuestPayload(
        {
          id: subId,
          event_id: eventId,
          parent_guest_id: editingSubGuest.parentId,
          first_name: editingSubGuest.sub.first_name ?? "",
          last_name: editingSubGuest.sub.last_name ?? "",
          phone: "",
          email: "",
          relation: parent?.relation ?? editingSubGuest.sub.relation ?? "",
          side: parent?.side ?? editingSubGuest.sub.side ?? "",
          rsvp: editingSubGuest.sub.rsvp ?? "",
          allergens: editingSubGuest.sub.allergens ?? "",
          notes: editingSubGuest.sub.notes ?? "",
        } as GuestPayload,
        eventId
      );

      const updated = await api.updateGuest(subId, payload);

      setGuests((prev) =>
        prev.map((g) => {
          if (g.id !== editingSubGuest.parentId) return g;
          return {
            ...g,
            SubGuests: (g.SubGuests || []).map((sg) =>
              sg.id === subId ? ({ ...sg, ...payload, ...updated } as Guest) : sg
            ),
          };
        })
      );

      setEditingSubGuest(null);
    } catch (e: unknown) {
      subGuestModalForm.setFromApiError(e, buildFriendlyError(e, "Nie udało się zapisać współgościa."));
    }
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* HEADER */}
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
          <button
            onClick={() => {
              guestModalForm.clear();
              setGuestForm({
                first_name: "",
                last_name: "",
                phone: "",
                email: "",
                relation: "",
                side: "",
                rsvp: "",
                allergens: "",
                notes: "",
                parent_guest_id: "",
              });
              setShowAddGuestModal(true);
            }}
            className={btnGold}
          >
            <UserPlus className="h-4 w-4" />
            Dodaj gościa
          </button>

          {!interviewLoading && canImport ? (
            <button onClick={() => setShowImportModal(true)} className={btnSecondary}>
              <Download className="h-4 w-4 text-[#d7b45a]" />
              Importuj
            </button>
          ) : null}

          <button onClick={handleExportExcel} className={btnSecondary}>
            <FileUp className="h-4 w-4 text-[#d7b45a]" />
            Eksportuj
          </button>
        </div>
      </div>

      {/* LISTA */}
      {listError ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-100 mb-4">{listError}</div>
      ) : null}

      {listLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">Ładowanie gości…</div>
      ) : guests.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">Brak gości</div>
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
                  <button
                    onClick={() => {
                      guestModalForm.clear();
                      setEditingGuest(guest);
                    }}
                    className={btnSecondary}
                  >
                    Edytuj
                  </button>

                  <button
                    onClick={() => handleDeleteGuestAsk(guest)}
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
                    onClick={() => {
                      subGuestModalForm.clear();
                      setShowAddSubGuestModal({ open: true, parentId: guest.id! });
                      setSubGuestForm({
                        parent_guest_id: guest.id!,
                        first_name: "",
                        last_name: "",
                        phone: "",
                        email: "",
                        relation: guest.relation ?? "",
                        side: guest.side ?? "",
                        rsvp: "",
                        allergens: "",
                        notes: "",
                      });
                    }}
                    className={btnGold}
                  >
                    + Współgość
                  </button>
                </div>
              </div>

              {/* SUBGOŚCIE */}
              <ol className="pl-6 mt-4 space-y-2 border-l border-white/10 list-decimal">
                {(guest.SubGuests || []).map((sg) => (
                  <li key={sg.id} className="mt-4 p-5 rounded-2xl border border-white/10 bg-white/4 backdrop-blur">
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

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            subGuestModalForm.clear();
                            setEditingSubGuest({
                              parentId: guest.id!,
                              sub: {
                                ...sg,
                                relation: guest.relation ?? sg.relation,
                                side: guest.side ?? sg.side,
                              },
                            });
                          }}
                          className={btnSecondary}
                        >
                          Edytuj
                        </button>

                        <button
                          onClick={() => handleDeleteGuestAsk(sg)}
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

      {/* MODAL: Dodaj gościa */}
      {showAddGuestModal && (
        <Modal
          onClose={() => {
            guestModalForm.clear();
            setShowAddGuestModal(false);
          }}
          title="Dodaj gościa"
        >
          {guestModalForm.formError ? (
            <div className="mb-3">
              <ErrorMessage title="Nie udało się zapisać">{guestModalForm.formError}</ErrorMessage>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <input
                placeholder="Imię *"
                value={guestForm.first_name}
                onChange={(e) => {
                  const v = sanitizeNameInput(e.target.value);
                  setGuestForm({ ...guestForm, first_name: v });
                  guestModalForm.clearField("first_name");
                }}
                className={inputBase}
              />
              <FieldError message={guestModalForm.fieldErrors.first_name} />
            </div>

            <div>
              <input
                placeholder="Nazwisko *"
                value={guestForm.last_name}
                onChange={(e) => {
                  const v = sanitizeNameInput(e.target.value);
                  setGuestForm({ ...guestForm, last_name: v });
                  guestModalForm.clearField("last_name");
                }}
                className={inputBase}
              />
              <FieldError message={guestModalForm.fieldErrors.last_name} />
            </div>

            <div>
              <input
                placeholder="Telefon (9 cyfr) *"
                value={guestForm.phone || ""}
                inputMode="numeric"
                maxLength={9}
                onChange={(e) => {
                  const v = sanitizePhoneInput(e.target.value);
                  setGuestForm({ ...guestForm, phone: v });
                  guestModalForm.clearField("phone");
                }}
                className={inputBase}
              />
              <FieldError message={guestModalForm.fieldErrors.phone} />
            </div>

            <div>
              <input
                placeholder="Email"
                value={guestForm.email || ""}
                onChange={(e) => {
                  setGuestForm({ ...guestForm, email: e.target.value });
                  guestModalForm.clearField("email");
                }}
                className={inputBase}
              />
              <FieldError message={guestModalForm.fieldErrors.email} />
            </div>

            <div>
              <Select
                label="Relacja"
                value={(guestForm.relation as RelationKey) || ""}
                onChange={(v) => {
                  setGuestForm({ ...guestForm, relation: v });
                  guestModalForm.clearField("relation");
                }}
                options={RELATION_OPTIONS}
              />
              <FieldError message={guestModalForm.fieldErrors.relation} />
            </div>

            <div>
              <Select
                label="Strona"
                value={(guestForm.side as SideKey) || ""}
                onChange={(v) => {
                  setGuestForm({ ...guestForm, side: v });
                  guestModalForm.clearField("side");
                }}
                options={SIDE_OPTIONS}
              />
              <FieldError message={guestModalForm.fieldErrors.side} />
            </div>

            <div>
              <Select
                label="RSVP"
                value={(guestForm.rsvp as RsvpKey) || ""}
                onChange={(v) => {
                  setGuestForm({ ...guestForm, rsvp: v });
                  guestModalForm.clearField("rsvp");
                }}
                options={RSVP_OPTIONS}
              />
              <FieldError message={guestModalForm.fieldErrors.rsvp} />
            </div>

            <div className="hidden md:block" />

            <div className="md:col-span-2">
              <textarea
                placeholder="Alergeny"
                value={guestForm.allergens || ""}
                onChange={(e) => {
                  setGuestForm({ ...guestForm, allergens: e.target.value });
                  guestModalForm.clearField("allergens");
                }}
                className={textareaBase}
              />
              <FieldError message={guestModalForm.fieldErrors.allergens} />
            </div>

            <div className="md:col-span-2">
              <textarea
                placeholder="Notatki"
                value={guestForm.notes || ""}
                onChange={(e) => {
                  setGuestForm({ ...guestForm, notes: e.target.value });
                  guestModalForm.clearField("notes");
                }}
                className={textareaBase}
              />
              <FieldError message={guestModalForm.fieldErrors.notes} />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                guestModalForm.clear();
                setShowAddGuestModal(false);
              }}
              className={btnSecondary}
            >
              Anuluj
            </button>

            <button onClick={handleAddGuest} className={btnGold}>
              Dodaj
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL: Dodaj współgościa */}
      {showAddSubGuestModal.open && (
        <Modal
          onClose={() => {
            subGuestModalForm.clear();
            setShowAddSubGuestModal({ open: false });
          }}
          title="Dodaj współgościa"
        >
          {subGuestModalForm.formError ? (
            <div className="mb-3">
              <ErrorMessage title="Nie udało się zapisać">{subGuestModalForm.formError}</ErrorMessage>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <input
                placeholder="Imię *"
                value={subGuestForm.first_name}
                onChange={(e) => {
                  const v = sanitizeNameInput(e.target.value);
                  setSubGuestForm({ ...subGuestForm, first_name: v });
                  subGuestModalForm.clearField("first_name");
                }}
                className={inputBase}
              />
              <FieldError message={subGuestModalForm.fieldErrors.first_name} />
            </div>

            <div>
              <input
                placeholder="Nazwisko *"
                value={subGuestForm.last_name}
                onChange={(e) => {
                  const v = sanitizeNameInput(e.target.value);
                  setSubGuestForm({ ...subGuestForm, last_name: v });
                  subGuestModalForm.clearField("last_name");
                }}
                className={inputBase}
              />
              <FieldError message={subGuestModalForm.fieldErrors.last_name} />
            </div>

            <Select
              label="Relacja"
              value={(subGuestForm.relation as RelationKey) || ""}
              options={RELATION_OPTIONS}
              disabled
              onChange={() => {}}
            />
            <Select
              label="Strona"
              value={(subGuestForm.side as SideKey) || ""}
              options={SIDE_OPTIONS}
              disabled
              onChange={() => {}}
            />

            <Select
              label="RSVP"
              value={(subGuestForm.rsvp as RsvpKey) || ""}
              onChange={(v) => {
                setSubGuestForm({ ...subGuestForm, rsvp: v });
                subGuestModalForm.clearField("rsvp");
              }}
              options={RSVP_OPTIONS}
            />

            <div className="hidden md:block" />

            <textarea
              placeholder="Alergeny"
              value={subGuestForm.allergens || ""}
              onChange={(e) => {
                setSubGuestForm({ ...subGuestForm, allergens: e.target.value });
                subGuestModalForm.clearField("allergens");
              }}
              className={`${textareaBase} md:col-span-2`}
            />
            <textarea
              placeholder="Notatki"
              value={subGuestForm.notes || ""}
              onChange={(e) => {
                setSubGuestForm({ ...subGuestForm, notes: e.target.value });
                subGuestModalForm.clearField("notes");
              }}
              className={`${textareaBase} md:col-span-2`}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                subGuestModalForm.clear();
                setShowAddSubGuestModal({ open: false });
              }}
              className={btnSecondary}
            >
              Anuluj
            </button>
            <button onClick={handleAddSubGuest} className={btnGold}>
              Dodaj
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL: Edycja gościa */}
      {editingGuest && (
        <Modal
          onClose={() => {
            guestModalForm.clear();
            setEditingGuest(null);
          }}
          title="Edytuj dane gościa"
        >
          {guestModalForm.formError ? (
            <div className="mb-3">
              <ErrorMessage title="Nie udało się zapisać">{guestModalForm.formError}</ErrorMessage>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <input
                placeholder="Imię *"
                value={editingGuest.first_name}
                onChange={(e) => {
                  const v = sanitizeNameInput(e.target.value);
                  setEditingGuest({ ...editingGuest, first_name: v });
                  guestModalForm.clearField("first_name");
                }}
                className={inputBase}
              />
              <FieldError message={guestModalForm.fieldErrors.first_name} />
            </div>

            <div>
              <input
                placeholder="Nazwisko *"
                value={editingGuest.last_name}
                onChange={(e) => {
                  const v = sanitizeNameInput(e.target.value);
                  setEditingGuest({ ...editingGuest, last_name: v });
                  guestModalForm.clearField("last_name");
                }}
                className={inputBase}
              />
              <FieldError message={guestModalForm.fieldErrors.last_name} />
            </div>

            <div>
              <input
                placeholder="Telefon (9 cyfr) *"
                value={editingGuest.phone || ""}
                inputMode="numeric"
                maxLength={9}
                onChange={(e) => {
                  const v = sanitizePhoneInput(e.target.value);
                  setEditingGuest({ ...editingGuest, phone: v });
                  guestModalForm.clearField("phone");
                }}
                className={inputBase}
              />
              <FieldError message={guestModalForm.fieldErrors.phone} />
            </div>

            <div>
              <input
                placeholder="Email"
                value={editingGuest.email || ""}
                onChange={(e) => {
                  setEditingGuest({ ...editingGuest, email: e.target.value });
                  guestModalForm.clearField("email");
                }}
                className={inputBase}
              />
              <FieldError message={guestModalForm.fieldErrors.email} />
            </div>

            <div>
              <Select
                label="Relacja"
                value={(editingGuest.relation as RelationKey) || ""}
                onChange={(v) => {
                  setEditingGuest({ ...editingGuest, relation: v });
                  guestModalForm.clearField("relation");
                }}
                options={RELATION_OPTIONS}
              />
              <FieldError message={guestModalForm.fieldErrors.relation} />
            </div>

            <div>
              <Select
                label="Strona"
                value={(editingGuest.side as SideKey) || ""}
                onChange={(v) => {
                  setEditingGuest({ ...editingGuest, side: v });
                  guestModalForm.clearField("side");
                }}
                options={SIDE_OPTIONS}
              />
              <FieldError message={guestModalForm.fieldErrors.side} />
            </div>

            <div>
              <Select
                label="RSVP"
                value={(editingGuest.rsvp as RsvpKey) || ""}
                onChange={(v) => {
                  setEditingGuest({ ...editingGuest, rsvp: v });
                  guestModalForm.clearField("rsvp");
                }}
                options={RSVP_OPTIONS}
              />
              <FieldError message={guestModalForm.fieldErrors.rsvp} />
            </div>

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
            <button onClick={() => setEditingGuest(null)} className={btnSecondary}>
              Anuluj
            </button>
            <button onClick={handleSaveEdit} className={btnGold}>
              Zapisz
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL: Edycja współgościa */}
      {editingSubGuest && (
        <Modal
          onClose={() => {
            subGuestModalForm.clear();
            setEditingSubGuest(null);
          }}
          title="Edytuj dane współgościa"
        >
          {subGuestModalForm.formError ? (
            <div className="mb-3">
              <ErrorMessage title="Nie udało się zapisać">{subGuestModalForm.formError}</ErrorMessage>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <input
                placeholder="Imię *"
                value={editingSubGuest.sub.first_name}
                onChange={(e) => {
                  const v = sanitizeNameInput(e.target.value);
                  setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, first_name: v } });
                  subGuestModalForm.clearField("first_name");
                }}
                className={inputBase}
              />
              <FieldError message={subGuestModalForm.fieldErrors.first_name} />
            </div>

            <div>
              <input
                placeholder="Nazwisko *"
                value={editingSubGuest.sub.last_name}
                onChange={(e) => {
                  const v = sanitizeNameInput(e.target.value);
                  setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, last_name: v } });
                  subGuestModalForm.clearField("last_name");
                }}
                className={inputBase}
              />
              <FieldError message={subGuestModalForm.fieldErrors.last_name} />
            </div>

            <Select
              label="Relacja"
              value={(editingSubGuest.sub.relation as RelationKey) || ""}
              onChange={(v) => setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, relation: v } })}
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
                setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, allergens: e.target.value } })
              }
              className={`${textareaBase} md:col-span-2`}
            />
            <textarea
              placeholder="Notatki"
              value={editingSubGuest.sub.notes || ""}
              onChange={(e) =>
                setEditingSubGuest({ ...editingSubGuest, sub: { ...editingSubGuest.sub, notes: e.target.value } })
              }
              className={`${textareaBase} md:col-span-2`}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setEditingSubGuest(null)} className={btnSecondary}>
              Anuluj
            </button>
            <button onClick={handleSaveSubEdit} className={btnGold}>
              Zapisz
            </button>
          </div>
        </Modal>
      )}

      {/* ✅ MODAL: Potwierdzenie usunięcia z wymuszeniem checkboxa */}
      {confirmModal.open && (
        <Modal
          onClose={() => {
            setConfirmModal({ open: false, message: "" });
            setConfirmCascadeChecked(false);
          }}
          title="Potwierdzenie"
        >
          <p className="mb-4 text-white/80">{confirmModal.message}</p>

          {confirmModal.isContactPerson && confirmModal.hasSubGuests ? (
            <div className="mb-4 rounded-2xl border border-[#c8a04b]/25 bg-[#c8a04b]/10 p-4 text-white/85">
              <div className="font-semibold text-[#d7b45a] mb-1">Uwaga</div>
              <div className="text-sm text-white/80">
                Ta osoba jest <b>osobą kontaktową</b>. Usunięcie wymaga potwierdzenia, ponieważ spowoduje usunięcie
                wszystkich przypisanych <b>współgości</b>.
              </div>

              <label className="mt-3 flex items-center gap-3 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmCascadeChecked}
                  onChange={(e) => setConfirmCascadeChecked(e.target.checked)}
                  className="h-4 w-4 accent-[#d7b45a]"
                />
                Usuwam również wszystkich współgości (kaskadowo)
              </label>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setConfirmModal({ open: false, message: "" });
                setConfirmCascadeChecked(false);
              }}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            >
              Anuluj
            </button>

            <button
              onClick={runDelete}
              disabled={!!confirmModal.isContactPerson && !!confirmModal.hasSubGuests && !confirmCascadeChecked}
              className={
                "px-4 py-2 rounded-xl font-medium transition " +
                (confirmModal.isContactPerson && confirmModal.hasSubGuests && !confirmCascadeChecked
                  ? "bg-red-600/40 text-white/60 cursor-not-allowed"
                  : "bg-red-600 text-white hover:brightness-105")
              }
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

          const data = await api.getGuests(eventId);
          setGuests(data);
        }}
      />
    </div>
  );
};

export default Guests;
