// CeremoDay/web/src/pages/WeddingDay.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import PageLayout from "../layout/PageLayout";
import Tile from "../ui/Tile";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import Input from "../ui/Input";
import TimePickerWheel from "../ui/TimePickerWheel";
import ModalPortal from "../ui/ModalPortal";

import { api } from "../lib/api";
import { useUiStore } from "../store/ui";

import type { Vendor } from "../types/vendor";
import type {
  WeddingDayResponse,
  WeddingDayScheduleItem,
  WeddingDayChecklistItem,
  WeddingDayContact,
  WeddingDayScheduleStatus,
} from "../types/weddingDay";

import {
  Clock3,
  Clock,
  Play,
  MapPin,
  Phone,
  Mail,
  Check,
  Trash2,
  Plus,
  Sparkles,
  Pencil,
} from "lucide-react";

type Params = { id: string };

// -------------------------
// Scroll lock (stabilny)
// -------------------------
function lockScroll(lock: boolean) {
  const html = document.documentElement as HTMLElement;
  const body = document.body as HTMLBodyElement;

  const appScroll = document.querySelector("#app-scroll") as HTMLElement | null;

  const targets = [html, body, appScroll].filter(Boolean) as HTMLElement[];

  if (lock) {
    for (const el of targets) {
      el.dataset.prevOverflow = el.style.overflow;
      el.style.overflow = "hidden";
    }
  } else {
    for (const el of targets) {
      el.style.overflow = el.dataset.prevOverflow ?? "";
      delete el.dataset.prevOverflow;
    }
  }
}

function normalizePhone(v?: string | null) {
  if (!v) return "";
  return v.replace(/\s+/g, "").trim();
}

function normalizeEmail(v?: string | null) {
  if (!v) return "";
  return v.trim().toLowerCase();
}

function isValidEmail(v: string): boolean {
  const s = v.trim();
  if (!s) return true; // puste OK (opcjonalne)
  // prosta, praktyczna walidacja (bez przesady): tekst@tekst.domena
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function sanitizePhone9(raw: string): string {
  // tylko cyfry 0-9, max 9 znaków
  return raw.replace(/\D+/g, "").slice(0, 9);
}

function makeVendorRole(v: Vendor): string {
  const t = (v as unknown as { type?: string }).type;
  if (t && String(t).trim()) return String(t).trim();
  return "Usługodawca";
}

export default function WeddingDay() {
  // =========================================================
  // TOAST / CONFIRM
  // =========================================================
  const confirmAsync = useUiStore((s) => s.confirmAsync);
  const toast = useUiStore((s) => s.toast);

  // =========================================================
  // STATUS UI
  // =========================================================
  const STATUS_META = {
    PLANNED: {
      label: "Plan",
      icon: Clock,
      className:
        "bg-white/[0.05] border border-white/12 text-white/75 hover:bg-white/[0.09]",
    },
    IN_PROGRESS: {
      label: "W toku",
      icon: Play,
      className:
        "bg-blue-400/12 border border-blue-400/22 text-blue-100 hover:bg-blue-400/20",
    },
    DONE: {
      label: "Zrobione",
      icon: Check,
      className:
        "bg-emerald-400/12 border border-emerald-400/22 text-emerald-100 hover:bg-emerald-400/20",
    },
  } as const;

  function statusLabel(s: WeddingDayScheduleStatus): string {
    const key = s.toUpperCase() as keyof typeof STATUS_META;
    return STATUS_META[key]?.label ?? s;
  }

  function StatusPill(props: {
    status: WeddingDayScheduleStatus;
    onClick?: () => void;
    active?: boolean; // modal
    solid?: boolean; // lista
  }) {
    const { status, onClick, active = false, solid = false } = props;

    const meta = STATUS_META[status.toUpperCase() as keyof typeof STATUS_META];
    const Icon = meta.icon;

    const base =
      "inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-medium leading-none transition-all border whitespace-nowrap";

    if (solid) {
      return (
        <button
          type="button"
          onClick={onClick}
          className={`${base} ${meta.className}`}
          title="Kliknij aby zmienić status"
        >
          <Icon className="w-4 h-4" />
          {meta.label}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} ${
          active ? meta.className : "border-white/10 text-white/55 hover:bg-white/5"
        }`}
      >
        <Icon className="w-4 h-4" />
        {meta.label}
      </button>
    );
  }

  // =========================================================
  // ROUTE / STATE
  // =========================================================
  const { id } = useParams<Params>();
  const eventId = id ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [data, setData] = useState<WeddingDayResponse | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // --- formularz: dodaj punkt ---
  const [sTime, setSTime] = useState("12:00");
  const [sTitle, setSTitle] = useState("");
  const [sDescription, setSDescription] = useState("");
  const [sLocation, setSLocation] = useState("");
  const [sResponsible, setSResponsible] = useState("");

  // --- formularz: kontakt (ręczny) ---
  const [kName, setKName] = useState("");
  const [kRole, setKRole] = useState("");
  const [kPhone, setKPhone] = useState("");
  const [kEmail, setKEmail] = useState("");

  const [kPhoneError, setKPhoneError] = useState<string | null>(null);
  const [kEmailError, setKEmailError] = useState<string | null>(null);

  // --- EDIT MODAL (punkt osi dnia) ---
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<WeddingDayScheduleItem | null>(null);
  const [eTime, setETime] = useState("12:00");
  const [eTitle, setETitle] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [eLocation, setELocation] = useState("");
  const [eResponsible, setEResponsible] = useState("");
  const [eStatus, setEStatus] = useState<WeddingDayScheduleStatus>("planned");
  const [savingEdit, setSavingEdit] = useState(false);

  // --- EDIT MODAL (kontakt ręczny) ---
  const [contactEditOpen, setContactEditOpen] = useState(false);
  const [contactEditItem, setContactEditItem] = useState<WeddingDayContact | null>(null);
  const [cName, setCName] = useState("");
  const [cRole, setCRole] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhoneError, setCPhoneError] = useState<string | null>(null);
  const [cEmailError, setCEmailError] = useState<string | null>(null);
  const [savingContactEdit, setSavingContactEdit] = useState(false);

  // ✅ stabilny lock (dla obu modali)
  useEffect(() => {
    const anyOpen = editOpen || contactEditOpen;
    if (anyOpen) lockScroll(true);
    return () => lockScroll(false);
  }, [editOpen, contactEditOpen]);

  function openEdit(it: WeddingDayScheduleItem) {
    setEditItem(it);
    setETime(it.time);
    setETitle(it.title);
    setEDescription(it.description ?? "");
    setELocation(it.location ?? "");
    setEResponsible(it.responsible ?? "");
    setEStatus(it.status);
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditItem(null);
    setSavingEdit(false);
  }

  function openContactEdit(c: WeddingDayContact) {
    setContactEditItem(c);
    setCName(c.name ?? "");
    setCRole(c.role ?? "");
    setCPhone(c.phone ?? "");
    setCEmail(c.email ?? "");
    setCPhoneError(null);
    setCEmailError(null);
    setSavingContactEdit(false);
    setContactEditOpen(true);
  }

  function closeContactEdit() {
    setContactEditOpen(false);
    setContactEditItem(null);
    setSavingContactEdit(false);
  }

  // =========================================================
  // LOAD
  // =========================================================
  async function reload() {
    if (!eventId) return;
    try {
      setErr(null);
      setLoading(true);

      const res = (await api.getWeddingDay(eventId)) as WeddingDayResponse;
      setData(res);

      try {
        const evVendors = (await api.getEventVendors(eventId)) as Vendor[];
        setVendors(Array.isArray(evVendors) ? evVendors : []);
      } catch {
        setVendors([]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać danych dnia ślubu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // =========================================================
  // DERIVED
  // =========================================================
  const schedule = useMemo(
    () => (data?.schedule ?? []).slice().sort((a, b) => a.time.localeCompare(b.time)),
    [data]
  );

  const checklist = useMemo(() => data?.checklist ?? [], [data]);
  const manualContacts = useMemo(() => data?.contacts ?? [], [data]);

  const checklistByScheduleId = useMemo(() => {
    const map = new Map<string, WeddingDayChecklistItem[]>();
    for (const it of checklist) {
      if (!it.schedule_item_id) continue;
      const arr = map.get(it.schedule_item_id) ?? [];
      arr.push(it);
      map.set(it.schedule_item_id, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => Number(a.done) - Number(b.done));
      map.set(k, arr);
    }
    return map;
  }, [checklist]);

  const autoContacts = useMemo(() => {
    const fromVendors = (vendors ?? [])
      .map((v) => {
        const phone = (v as unknown as { phone?: string | null }).phone ?? null;
        const email = (v as unknown as { email?: string | null }).email ?? null;

        return {
          key: `vendor:${(v as unknown as { id?: string }).id ?? v.name}`,
          name: v.name,
          role: makeVendorRole(v),
          phone: phone && String(phone).trim() ? String(phone).trim() : null,
          email: email && String(email).trim() ? String(email).trim() : null,
        };
      })
      .filter((x) => x.name && (x.phone || x.email));

    const seen = new Set<string>();
    const out: typeof fromVendors = [];
    for (const c of fromVendors) {
      const k =
        (c.email ? `e:${normalizeEmail(c.email)}` : "") +
        "|" +
        (c.phone ? `p:${normalizePhone(c.phone)}` : "") +
        "|" +
        `n:${c.name.toLowerCase().trim()}`;

      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }

    return out;
  }, [vendors]);

  // =========================================================
  // ACTIONS
  // =========================================================
  async function addSchedule() {
    if (!sTitle.trim()) {
      toast({
        tone: "danger",
        title: "Brak tytułu",
        message: "Uzupełnij tytuł punktu harmonogramu.",
      });
      return;
    }

    try {
      await api.addWeddingDaySchedule(eventId, {
        time: sTime,
        title: sTitle.trim(),
        description: sDescription.trim() || null,
        location: sLocation.trim() || null,
        responsible: sResponsible.trim() || null,
      });

      setSTitle("");
      setSLocation("");
      setSResponsible("");
      setSDescription("");

      toast({
        tone: "success",
        title: "Dodano punkt",
        message: `Dodano „${sTitle.trim()}” o ${sTime}.`,
      });

      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się dodać punktu harmonogramu.";
      toast({ tone: "danger", title: "Błąd", message: msg });
      setErr(msg);
    }
  }

  async function removeSchedule(itemId: string, titleForUi?: string) {
    const ok = await confirmAsync({
      title: "Usunąć punkt harmonogramu?",
      message: "Czy na pewno chcesz usunąć ten punkt z osi dnia? Tej operacji nie da się cofnąć.",
      confirmText: "Usuń",
      cancelText: "Anuluj",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await api.deleteWeddingDaySchedule(eventId, itemId);

      toast({
        tone: "success",
        title: "Usunięto punkt",
        message: titleForUi ? `Usunięto „${titleForUi}”.` : "Punkt został usunięty.",
      });

      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się usunąć punktu harmonogramu.";
      toast({ tone: "danger", title: "Błąd", message: msg });
      setErr(msg);
    }
  }

  async function advanceScheduleStatus(it: WeddingDayScheduleItem) {
    const next: WeddingDayScheduleStatus =
      it.status === "planned" ? "in_progress" : it.status === "in_progress" ? "done" : "done";

    try {
      await api.updateWeddingDaySchedule(eventId, it.id, { status: next });

      toast({
        tone: "success",
        title: "Zmieniono status",
        message: `„${it.title}” → ${statusLabel(next)}.`,
      });

      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się zmienić statusu.";
      toast({ tone: "danger", title: "Błąd", message: msg });
      setErr(msg);
    }
  }

  async function saveEdit() {
    if (!editItem) return;

    if (!eTitle.trim()) {
      toast({
        tone: "danger",
        title: "Brak tytułu",
        message: "Tytuł punktu nie może być pusty.",
      });
      return;
    }

    setSavingEdit(true);
    try {
      await api.updateWeddingDaySchedule(eventId, editItem.id, {
        time: eTime,
        title: eTitle.trim(),
        description: eDescription.trim() || null,
        location: eLocation.trim() ? eLocation.trim() : null,
        responsible: eResponsible.trim() ? eResponsible.trim() : null,
        status: eStatus,
      });

      toast({
        tone: "success",
        title: "Zapisano zmiany",
        message: `Zaktualizowano „${eTitle.trim()}”.`,
      });

      closeEdit();
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się zapisać zmian.";
      toast({ tone: "danger", title: "Błąd", message: msg });
      setErr(msg);
    } finally {
      setSavingEdit(false);
    }
  }

  async function addContact() {
    if (!kName.trim()) {
      toast({
        tone: "danger",
        title: "Brak nazwy",
        message: "Uzupełnij imię/nazwę kontaktu.",
      });
      return;
    }

    const phoneSan = sanitizePhone9(kPhone);
    if (kPhone.trim() && phoneSan.length !== 9) {
      toast({
        tone: "danger",
        title: "Niepoprawny telefon",
        message: "Telefon musi mieć dokładnie 9 cyfr (0–9), bez spacji i znaków.",
      });
      return;
    }

    if (kEmail.trim() && !isValidEmail(kEmail)) {
      toast({
        tone: "danger",
        title: "Niepoprawny email",
        message: "Wpisz email w formacie: nazwa@domena.pl (np. anna.kowalska@gmail.com).",
      });
      return;
    }

    try {
      await api.addWeddingDayContact(eventId, {
        name: kName.trim(),
        role: kRole.trim() || null,
        phone: sanitizePhone9(kPhone) || null,
        email: kEmail.trim() ? normalizeEmail(kEmail) : null,
      });

      toast({
        tone: "success",
        title: "Dodano kontakt",
        message: `Dodano „${kName.trim()}”.`,
      });

      setKName("");
      setKRole("");
      setKPhone("");
      setKEmail("");
      setKPhoneError(null);
      setKEmailError(null);
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się dodać kontaktu.";
      toast({ tone: "danger", title: "Błąd", message: msg });
      setErr(msg);
    }
  }

  async function saveContactEdit() {
    if (!contactEditItem) return;

    if (!cName.trim()) {
      toast({
        tone: "danger",
        title: "Brak nazwy",
        message: "Imię / nazwa kontaktu nie może być puste.",
      });
      return;
    }

    const phoneSan = sanitizePhone9(cPhone);
    if (cPhone.trim() && phoneSan.length !== 9) {
      toast({
        tone: "danger",
        title: "Niepoprawny telefon",
        message: "Telefon musi mieć dokładnie 9 cyfr (0–9), bez spacji i znaków.",
      });
      return;
    }

    if (cEmail.trim() && !isValidEmail(cEmail)) {
      toast({
        tone: "danger",
        title: "Niepoprawny email",
        message: "Wpisz email w formacie: nazwa@domena.pl (np. anna.kowalska@gmail.com).",
      });
      return;
    }

    setSavingContactEdit(true);
    try {
      // Zakładamy analogiczne API jak dla harmonogramu:
      // updateWeddingDayContact(eventId, contactId, payload)
      await api.updateWeddingDayContact(eventId, contactEditItem.id, {
        name: cName.trim(),
        role: cRole.trim() || null,
        phone: sanitizePhone9(cPhone) || null,
        email: cEmail.trim() ? normalizeEmail(cEmail) : null,
      });

      toast({
        tone: "success",
        title: "Zapisano zmiany",
        message: `Zaktualizowano „${cName.trim()}”.`,
      });

      closeContactEdit();
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się zapisać zmian kontaktu.";
      toast({ tone: "danger", title: "Błąd", message: msg });
      setErr(msg);
    } finally {
      setSavingContactEdit(false);
    }
  }

  async function removeContact(contactId: string, nameForUi?: string) {
    const ok = await confirmAsync({
      title: "Usunąć kontakt?",
      message: "Czy na pewno chcesz usunąć ten kontakt?",
      confirmText: "Usuń",
      cancelText: "Anuluj",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await api.deleteWeddingDayContact(eventId, contactId);

      toast({
        tone: "success",
        title: "Usunięto kontakt",
        message: nameForUi ? `Usunięto „${nameForUi}”.` : "Kontakt został usunięty.",
      });

      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się usunąć kontaktu.";
      toast({ tone: "danger", title: "Błąd", message: msg });
      setErr(msg);
    }
  }

  // =========================================================
  // UI helpers
  // =========================================================
  const rowCard =
    "rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3";

  if (!eventId) {
    return (
      <PageLayout title="Dzień ślubu" subtitle="Brak eventId w URL" actions={null}>
        <Tile>
          <div className="text-sm text-red-200">Brak eventId w URL.</div>
        </Tile>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Dzień ślubu"
      subtitle="Harmonogram dnia i szybkie kontakty — wszystko w jednym miejscu"
    >
      {err ? (
        <Tile>
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        </Tile>
      ) : null}

      {/* =========================================================
          OŚ DNIA
         ========================================================= */}
      <Tile>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-lg font-semibold text-white">Oś dnia</div>
            <div className="text-sm text-white/70">
              Dodajesz punkty harmonogramu i zadania przypięte do konkretnych momentów.
            </div>
          </div>
        </div>

        {/* Dodaj punkt */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Clock3 className="w-4 h-4 text-white/70" />
            Dodaj punkt harmonogramu
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-white/70 mb-1">Godzina</label>
              <TimePickerWheel value={sTime} onChange={setSTime} heightPx={37} />
            </div>

            <Input
              label="Tytuł"
              value={sTitle}
              onChange={(e) => setSTitle(e.target.value)}
              placeholder="np. Ceremonia"
            />
            <Input
              label="Opis"
              value={sDescription}
              onChange={(e) => setSDescription(e.target.value)}
              placeholder="opcjonalne informacje, uwagi, kolejność działań…"
            />
            <Input
              label="Lokalizacja"
              value={sLocation}
              onChange={(e) => setSLocation(e.target.value)}
              placeholder="opcjonalnie"
            />
            <Input
              label="Odpowiedzialny"
              value={sResponsible}
              onChange={(e) => setSResponsible(e.target.value)}
              placeholder="opcjonalnie"
            />
          </div>

          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={() => void addSchedule()}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Dodaj do osi dnia
            </Button>
          </div>
        </div>

        {/* Lista punktów */}
        <div className="mt-6">
          {loading ? (
            <div className="text-sm text-white/70">Ładowanie…</div>
          ) : schedule.length === 0 ? (
            <EmptyState
              title="Brak harmonogramu"
              description="Dodaj pierwszą pozycję, np. przygotowania, ceremonia, obiad, pierwszy taniec…"
            />
          ) : (
            <div className="space-y-2">
              {schedule.map((it) => {
                const linkedTasks = checklistByScheduleId.get(it.id) ?? [];
                const doneCount = linkedTasks.filter((t) => t.done).length;

                return (
                  <div
                    key={it.id}
                    className="rounded-[22px] border border-white/10 bg-white/[0.03] overflow-hidden"
                  >
                    <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* LEFT */}
                      <div className="min-w-0 flex-1">
                        {/* LINIA 1 */}
                        <div className="flex items-center gap-4 flex-wrap text-[15px] text-white/80">
                          <span className="inline-flex items-center gap-2 font-semibold text-white shrink-0">
                            <Clock3 className="w-4 h-4 text-white/70" />
                            {it.time}
                          </span>

                          <span className="font-semibold text-white truncate max-w-[260px]">
                            {it.title}
                          </span>

                          {it.location && (
                            <span className="inline-flex items-center gap-1 text-white/70">
                              <MapPin className="w-4 h-4" />
                              {it.location}
                            </span>
                          )}

                          {it.responsible && (
                            <span className="text-white/60">Odp.: {it.responsible}</span>
                          )}

                          {linkedTasks.length > 0 && (
                            <span className="text-[13px] text-white/50">
                              • {doneCount}/{linkedTasks.length} zadań
                            </span>
                          )}
                        </div>

                        {/* LINIA 2 */}
                        {it.description && (
                          <div className="mt-1 text-[14px] leading-5 text-white/65">
                            {it.description}
                          </div>
                        )}
                      </div>

                      {/* RIGHT */}
                      <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                        <StatusPill
                          status={it.status}
                          solid
                          onClick={() => void advanceScheduleStatus(it)}
                        />

                        <Button
                          variant="ghost"
                          onClick={() => openEdit(it)}
                          leftIcon={<Pencil className="w-4 h-4" />}
                        >
                          Edytuj
                        </Button>

                        <Button
                          variant="ghost"
                          onClick={() => void removeSchedule(it.id, it.title)}
                          leftIcon={<Trash2 className="w-4 h-4" />}
                        >
                          Usuń
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Tile>

      {/* =========================================================
          KONTAKTY (Auto + ręczne)
         ========================================================= */}
      <Tile>
        <div>
          <div className="text-[18px] font-semibold text-white">Szybkie kontakty</div>
          <div className="text-[13px] text-white/70 mt-1">
            Najważniejsze osoby i usługi pod ręką (telefon/email). Na górze: automatycznie z
            usługodawców.
          </div>
        </div>

        {/* AUTO KONTAKTY */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[14px] font-semibold text-white">Kontakty z usługodawców</div>
          <div className="text-[12px] text-white/55 mt-1">
            Dane bierzemy z modułu “Usługodawcy”. Jeśli czegoś brakuje — uzupełnij vendora.
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="text-sm text-white/70">Ładowanie…</div>
            ) : autoContacts.length === 0 ? (
              <EmptyState
                title="Brak kontaktów z usługodawców"
                description="Dodaj usługodawców (z numerem telefonu lub emailem) w module Usługodawcy."
              />
            ) : (
              <div className="space-y-2">
                {autoContacts.map((c) => (
                  <div key={c.key} className={rowCard}>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold text-white">{c.name}</div>
                      <div className="mt-2 text-[12px] text-white/65 flex flex-wrap gap-x-4 gap-y-1">
                        {c.role ? <span className="text-white/55">{c.role}</span> : null}
                        {c.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-4 h-4" /> {c.phone}
                          </span>
                        ) : null}
                        {c.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-4 h-4" /> {c.email}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-[12px] text-white/45">auto</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RĘCZNE KONTAKTY */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[14px] font-semibold text-white">Dodaj kontakt ręcznie</div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              label="Imię / nazwa"
              value={kName}
              onChange={(e) => setKName(e.target.value)}
              placeholder="np. Świadek Paweł"
            />
            <Input
              label="Rola"
              value={kRole}
              onChange={(e) => setKRole(e.target.value)}
              placeholder="np. Świadek / Mama / Kościół"
            />
            <Input
              label="Telefon"
              value={kPhone}
              onChange={(e) => {
                const next = sanitizePhone9(e.target.value);
                setKPhone(next);
                if (next && next.length !== 9) {
                  setKPhoneError("Telefon musi mieć dokładnie 9 cyfr (0–9), bez spacji i znaków.");
                } else {
                  setKPhoneError(null);
                }
              }}
              placeholder="9 cyfr, np. 501234567"
              inputMode="numeric"
              pattern="\d*"
              maxLength={9}
              error={kPhoneError ?? undefined}
              hint={!kPhoneError ? "Tylko cyfry 0–9, maksymalnie 9 znaków." : undefined}
            />
            <Input
              label="Email"
              value={kEmail}
              onChange={(e) => {
                const next = e.target.value;
                setKEmail(next);
                if (next.trim() && !isValidEmail(next)) {
                  setKEmailError(
                    "Niepoprawny email. Wpisz w formacie: nazwa@domena.pl (np. anna.kowalska@gmail.com)."
                  );
                } else {
                  setKEmailError(null);
                }
              }}
              placeholder="np. anna.kowalska@gmail.com"
              error={kEmailError ?? undefined}
              hint={!kEmailError ? "Format: nazwa@domena.pl" : undefined}
            />
          </div>

          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={() => void addContact()}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Dodaj kontakt
            </Button>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="text-sm text-white/70">Ładowanie…</div>
            ) : manualContacts.length === 0 ? (
              <EmptyState
                title="Brak kontaktów ręcznych"
                description="Dodaj świadków, rodziców, osoby do pomocy, transport…"
              />
            ) : (
              <div className="space-y-2">
                {manualContacts.map((c: WeddingDayContact) => (
                  <div key={c.id} className={rowCard}>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold text-white">{c.name}</div>
                      <div className="mt-2 text-[12px] text-white/65 flex flex-wrap gap-x-4 gap-y-1">
                        {c.role ? <span className="text-white/55">{c.role}</span> : null}
                        {c.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-4 h-4" /> {c.phone}
                          </span>
                        ) : null}
                        {c.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-4 h-4" /> {c.email}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:justify-end">
                      <Button
                        variant="ghost"
                        onClick={() => openContactEdit(c)}
                        leftIcon={<Pencil className="w-4 h-4" />}
                      >
                        Edytuj
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => void removeContact(c.id, c.name)}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                      >
                        Usuń
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Tile>

      {/* =========================================================
          MODAL EDYCJI PUNKTU
         ========================================================= */}
      {editOpen && editItem ? (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onWheelCapture={(e) => e.preventDefault()}
            onTouchMoveCapture={(e) => e.preventDefault()}
          >
            <div
              className="absolute inset-0 bg-black/55 backdrop-blur-md"
              onClick={closeEdit}
              aria-hidden="true"
            />

            <div className="relative w-full max-w-3xl">
              <div className="rounded-2xl border border-white/10 bg-[#0b1b14]/90 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.55)] p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-white text-lg font-semibold">Edytuj punkt</div>
                    <div className="text-sm text-white/60 mt-1">
                      Zmieniasz dane punktu harmonogramu i możesz poprawić status.
                    </div>
                  </div>

                  <Button variant="ghost" onClick={closeEdit}>
                    Zamknij
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Godzina</label>
                    <TimePickerWheel value={eTime} onChange={setETime} heightPx={37} />
                  </div>

                  <Input label="Tytuł" value={eTitle} onChange={(e) => setETitle(e.target.value)} />
                  <Input
                    label="Opis"
                    value={eDescription}
                    onChange={(e) => setEDescription(e.target.value)}
                  />
                  <Input
                    label="Lokalizacja"
                    value={eLocation}
                    onChange={(e) => setELocation(e.target.value)}
                  />
                  <Input
                    label="Odpowiedzialny"
                    value={eResponsible}
                    onChange={(e) => setEResponsible(e.target.value)}
                  />

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Status</label>
                    <div className="flex gap-2 flex-wrap">
                      {(["planned", "in_progress", "done"] as WeddingDayScheduleStatus[]).map(
                        (s) => (
                          <StatusPill
                            key={s}
                            status={s}
                            active={eStatus === s}
                            onClick={() => setEStatus(s)}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <Button variant="secondary" onClick={closeEdit} disabled={savingEdit}>
                    Anuluj
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => void saveEdit()}
                    disabled={savingEdit}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                  >
                    {savingEdit ? "Zapisywanie…" : "Zapisz zmiany"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {/* =========================================================
          MODAL EDYCJI KONTAKTU RĘCZNEGO
         ========================================================= */}
      {contactEditOpen && contactEditItem ? (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onWheelCapture={(e) => e.preventDefault()}
            onTouchMoveCapture={(e) => e.preventDefault()}
          >
            <div
              className="absolute inset-0 bg-black/55 backdrop-blur-md"
              onClick={closeContactEdit}
              aria-hidden="true"
            />

            <div className="relative w-full max-w-3xl">
              <div className="rounded-2xl border border-white/10 bg-[#0b1b14]/90 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.55)] p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-white text-lg font-semibold">Edytuj kontakt</div>
                    <div className="text-sm text-white/60 mt-1">
                      Aktualizujesz szybki numer (telefon/email) dla dnia ślubu.
                    </div>
                  </div>

                  <Button variant="ghost" onClick={closeContactEdit}>
                    Zamknij
                  </Button>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Input
                    label="Imię / nazwa"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    placeholder="np. Świadek Paweł"
                  />
                  <Input
                    label="Rola"
                    value={cRole}
                    onChange={(e) => setCRole(e.target.value)}
                    placeholder="np. Świadek / Mama / Kościół"
                  />
                  <Input
                    label="Telefon"
                    value={cPhone}
                    onChange={(e) => {
                      const next = sanitizePhone9(e.target.value);
                      setCPhone(next);
                      if (next && next.length !== 9) {
                        setCPhoneError(
                          "Telefon musi mieć dokładnie 9 cyfr (0–9), bez spacji i znaków."
                        );
                      } else {
                        setCPhoneError(null);
                      }
                    }}
                    placeholder="9 cyfr, np. 501234567"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={9}
                    error={cPhoneError ?? undefined}
                    hint={!cPhoneError ? "Tylko cyfry 0–9, maksymalnie 9 znaków." : undefined}
                  />
                  <Input
                    label="Email"
                    value={cEmail}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCEmail(next);
                      if (next.trim() && !isValidEmail(next)) {
                        setCEmailError(
                          "Niepoprawny email. Wpisz w formacie: nazwa@domena.pl (np. anna.kowalska@gmail.com)."
                        );
                      } else {
                        setCEmailError(null);
                      }
                    }}
                    placeholder="np. anna.kowalska@gmail.com"
                    error={cEmailError ?? undefined}
                    hint={!cEmailError ? "Format: nazwa@domena.pl" : undefined}
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <Button variant="secondary" onClick={closeContactEdit} disabled={savingContactEdit}>
                    Anuluj
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => void saveContactEdit()}
                    disabled={savingContactEdit}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                  >
                    {savingContactEdit ? "Zapisywanie…" : "Zapisz zmiany"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </PageLayout>
  );
}
