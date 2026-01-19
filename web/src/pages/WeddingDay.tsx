import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import PageLayout from "../layout/PageLayout";
import Tile from "../ui/Tile";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { api } from "../lib/api";
import type {
  WeddingDayResponse,
  WeddingDayScheduleItem,
  WeddingDayChecklistItem,
  WeddingDayScheduleStatus,
} from "../types/weddingDay";
import { CheckCircle2, Clock3, MapPin, Phone, Mail, Trash2, Plus } from "lucide-react";

type Params = { id: string };

const statusLabel = (s: WeddingDayScheduleStatus) =>
  s === "planned" ? "Plan" : s === "in_progress" ? "W toku" : "Zrobione";

export default function WeddingDay() {
  const { id } = useParams<Params>();
  const eventId = id ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<WeddingDayResponse | null>(null);

  // --- formularze v1 ---
  const [sTime, setSTime] = useState("12:00");
  const [sTitle, setSTitle] = useState("");
  const [sLocation, setSLocation] = useState("");
  const [sResponsible, setSResponsible] = useState("");

  const [cTitle, setCTitle] = useState("");
  const [cLink, setCLink] = useState<string>(""); // schedule_item_id (opcjonalnie)

  const [kName, setKName] = useState("");
  const [kRole, setKRole] = useState("");
  const [kPhone, setKPhone] = useState("");
  const [kEmail, setKEmail] = useState("");

  async function reload() {
    if (!eventId) return;
    try {
      setErr(null);
      setLoading(true);
      const res = (await api.getWeddingDay(eventId)) as WeddingDayResponse;
      setData(res);
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

  const schedule = useMemo(
    () => (data?.schedule ?? []).slice().sort((a, b) => a.time.localeCompare(b.time)),
    [data]
  );

  const checklist = useMemo(() => data?.checklist ?? [], [data]);
  const contacts = useMemo(() => data?.contacts ?? [], [data]);

  async function addSchedule() {
    if (!sTitle.trim()) return;
    await api.addWeddingDaySchedule(eventId, {
      time: sTime,
      title: sTitle.trim(),
      location: sLocation.trim() || null,
      responsible: sResponsible.trim() || null,
    });
    setSTitle("");
    setSLocation("");
    setSResponsible("");
    await reload();
  }

  async function setScheduleStatus(item: WeddingDayScheduleItem, status: WeddingDayScheduleStatus) {
    await api.updateWeddingDaySchedule(eventId, item.id, { status });
    await reload();
  }

  async function removeSchedule(itemId: string) {
    await api.deleteWeddingDaySchedule(eventId, itemId);
    // po usunięciu harmonogramu backend odpina checklistę
    await reload();
  }

  async function addChecklist() {
    if (!cTitle.trim()) return;
    await api.addWeddingDayChecklist(eventId, {
      title: cTitle.trim(),
      schedule_item_id: cLink ? cLink : null,
    });
    setCTitle("");
    setCLink("");
    await reload();
  }

  async function toggleChecklist(item: WeddingDayChecklistItem) {
    await api.updateWeddingDayChecklist(eventId, item.id, { done: !item.done });
    await reload();
  }

  async function removeChecklist(itemId: string) {
    await api.deleteWeddingDayChecklist(eventId, itemId);
    await reload();
  }

  async function addContact() {
    if (!kName.trim()) return;
    await api.addWeddingDayContact(eventId, {
      name: kName.trim(),
      role: kRole.trim() || null,
      phone: kPhone.trim() || null,
      email: kEmail.trim() || null,
    });
    setKName("");
    setKRole("");
    setKPhone("");
    setKEmail("");
    await reload();
  }

  async function removeContact(contactId: string) {
    await api.deleteWeddingDayContact(eventId, contactId);
    await reload();
  }

  return (
    <PageLayout
      title="Dzień ślubu"
      subtitle="Harmonogram dnia, checklista i szybkie kontakty — wszystko w jednym miejscu"
      actions={<Button variant="secondary" onClick={reload} disabled={loading}>Odśwież</Button>}
    >
      {err ? (
        <Tile>
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        </Tile>
      ) : null}

      {/* HARMONOGRAM */}
      <Tile>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-lg font-semibold text-white">Harmonogram dnia</div>
            <div className="text-sm text-white/70">Ułóż plan i szybko zmieniaj status w trakcie dnia.</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input label="Godzina" value={sTime} onChange={(e) => setSTime(e.target.value)} placeholder="HH:mm" />
          <Input label="Tytuł" value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="np. Ceremonia" />
          <Input label="Lokalizacja" value={sLocation} onChange={(e) => setSLocation(e.target.value)} placeholder="opcjonalnie" />
          <Input label="Odpowiedzialny" value={sResponsible} onChange={(e) => setSResponsible(e.target.value)} placeholder="opcjonalnie" />
        </div>

        <div className="mt-3">
          <Button variant="secondary" onClick={addSchedule} leftIcon={<Plus className="w-4 h-4" />}>
            Dodaj do harmonogramu
          </Button>
        </div>

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
              {schedule.map((it) => (
                <div
                  key={it.id}
                  className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                        <Clock3 className="w-4 h-4 text-white/70" /> {it.time}
                      </div>
                      <div className="truncate text-sm font-semibold text-white">{it.title}</div>
                      <div className="text-xs text-white/60">• {statusLabel(it.status)}</div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/60">
                      {it.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {it.location}
                        </span>
                      ) : null}
                      {it.responsible ? <span>Odp.: {it.responsible}</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <Button variant="ghost" onClick={() => setScheduleStatus(it, "planned")}>Plan</Button>
                    <Button variant="ghost" onClick={() => setScheduleStatus(it, "in_progress")}>W toku</Button>
                    <Button variant="secondary" onClick={() => setScheduleStatus(it, "done")}>Zrobione</Button>
                    <Button variant="ghost" onClick={() => removeSchedule(it.id)} leftIcon={<Trash2 className="w-4 h-4" />}>
                      Usuń
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Tile>

      {/* CHECKLISTA */}
      <Tile>
        <div>
          <div className="text-lg font-semibold text-white">Checklista</div>
          <div className="text-sm text-white/70">Odhaczaj zadania. Możesz opcjonalnie przypiąć je do punktu harmonogramu.</div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Zadanie" value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="np. Odebrać bukiet" />
          <div className="md:col-span-2">
            <label className="block text-xs text-white/70 mb-1">Powiąż z harmonogramem (opcjonalnie)</label>
            <Select<string>
              value={cLink}
              onChange={(v) => setCLink(v)}
              options={[
                { value: "", label: "— brak —" },
                ...schedule.map((s) => ({
                  value: s.id,
                  label: `${s.time} • ${s.title}`,
                })),
              ]}
            />

          </div>
        </div>

        <div className="mt-3">
          <Button variant="secondary" onClick={addChecklist} leftIcon={<Plus className="w-4 h-4" />}>
            Dodaj do checklisty
          </Button>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="text-sm text-white/70">Ładowanie…</div>
          ) : checklist.length === 0 ? (
            <EmptyState title="Brak zadań" description="Dodaj checklistę na dzień ślubu, żeby nic nie uciekło." />
          ) : (
            <div className="space-y-2">
              {checklist.map((it) => {
                const linked = it.schedule_item_id ? schedule.find((s) => s.id === it.schedule_item_id) : null;
                return (
                  <div
                    key={it.id}
                    className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleChecklist(it)}
                          className={
                            "inline-flex items-center justify-center w-8 h-8 rounded-2xl border transition " +
                            (it.done ? "border-emerald-500/30 bg-emerald-500/15" : "border-white/10 bg-white/[0.02]")
                          }
                          title="Zmień status"
                        >
                          <CheckCircle2 className={"w-4 h-4 " + (it.done ? "text-emerald-200" : "text-white/50")} />
                        </button>
                        <div className={"truncate text-sm font-semibold " + (it.done ? "text-white/50 line-through" : "text-white")}>
                          {it.title}
                        </div>
                      </div>
                      {linked ? (
                        <div className="mt-1 text-xs text-white/60">
                          Powiązane: {linked.time} • {linked.title}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 md:justify-end">
                      <Button variant="ghost" onClick={() => removeChecklist(it.id)} leftIcon={<Trash2 className="w-4 h-4" />}>
                        Usuń
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Tile>

      {/* KONTAKTY */}
      <Tile>
        <div>
          <div className="text-lg font-semibold text-white">Szybkie kontakty</div>
          <div className="text-sm text-white/70">Najważniejsze osoby i usługi pod ręką (telefon/email).</div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input label="Imię / nazwa" value={kName} onChange={(e) => setKName(e.target.value)} placeholder="np. DJ Marcin" />
          <Input label="Rola" value={kRole} onChange={(e) => setKRole(e.target.value)} placeholder="np. DJ / Sala" />
          <Input label="Telefon" value={kPhone} onChange={(e) => setKPhone(e.target.value)} placeholder="opcjonalnie" />
          <Input label="Email" value={kEmail} onChange={(e) => setKEmail(e.target.value)} placeholder="opcjonalnie" />
        </div>

        <div className="mt-3">
          <Button variant="secondary" onClick={addContact} leftIcon={<Plus className="w-4 h-4" />}>
            Dodaj kontakt
          </Button>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="text-sm text-white/70">Ładowanie…</div>
          ) : contacts.length === 0 ? (
            <EmptyState title="Brak kontaktów" description="Dodaj świadków, rodziców, salę, fotografa, DJ-a, transport…" />
          ) : (
            <div className="space-y-2">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{c.name}</div>
                    <div className="mt-1 text-xs text-white/60 flex flex-wrap gap-3">
                      {c.role ? <span>{c.role}</span> : null}
                      {c.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {c.phone}
                        </span>
                      ) : null}
                      {c.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {c.email}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <Button variant="ghost" onClick={() => removeContact(c.id)} leftIcon={<Trash2 className="w-4 h-4" />}>
                      Usuń
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Tile>
    </PageLayout>
  );
}
