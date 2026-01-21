import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  ListChecks,
  Loader2,
  Trash2,
  Pencil,
  Plus,
} from "lucide-react";

import { api } from "../lib/api";
import type { Task, TaskCategory, TaskStatus, TaskPayload } from "../types/task";

import TaskStatusInline from "../components/tasks/TaskStatusInline";
import TaskCreateEditModal from "../components/tasks/TaskCreateEditModal";

type Params = { id: string };
type ViewMode = "list" | "timeline" | "calendar";

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  FORMALNOSCI: "Formalności",
  ORGANIZACJA: "Organizacja",
  USLUGI: "Usługi",
  DEKORACJE: "Dekoracje",
  LOGISTYKA: "Logistyka",
  DZIEN_SLUBU: "Dzień ślubu",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Do zrobienia",
  in_progress: "W trakcie",
  done: "Zrobione",
};

function parseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplayDate(dateStr?: string | null): string {
  const d = parseDate(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function Tasks() {
  const { id: eventId } = useParams<Params>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [statusFilter, setStatusFilter] = useState<Set<TaskStatus>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<Set<TaskCategory>>(new Set());


  // modal create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // kalendarz
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // === UI helpers: CeremoDay CRM vibe ===
  const chip =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full " +
    "border border-white/10 bg-white/5 text-white/80 text-xs";

  const cardBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_24px_80px_rgba(0,0,0,0.45)]";

  const btnSecondary =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
    "bg-white/5 text-white border border-white/10 " +
    "hover:bg-white/10 hover:border-white/15 " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/40 " +
    "transition disabled:opacity-60";

  const btnGold =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " +
    "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
    "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
    "hover:brightness-105 active:translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/45 " +
    "transition disabled:opacity-60";

  useEffect(() => {
    if (!eventId) return;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getTasks(eventId);
        setTasks(data);
      } catch (err) {
        console.error("❌ Błąd pobierania zadań:", err);
        setError("Nie udało się pobrać zadań");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [eventId]);

  const openCreate = () => {
    setModalMode("create");
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setModalMode("edit");
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSubmitModal = async (payload: TaskPayload) => {
    if (!eventId) return;

    try {
      setSavingId("modal");
      setError(null);

      if (modalMode === "create") {
        const created = await api.createTask(eventId, payload);
        setTasks((prev) => {
          const arr = Array.isArray(created) ? created : [created];
          return arr.length === 1 ? [...prev, arr[0]] : [...prev, ...arr];
        });
      } else if (modalMode === "edit" && editingTask) {
        const updated = await api.updateTask(editingTask.id, payload);
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? (updated as Task) : t))
        );
      }

      setModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      console.error("❌ Błąd zapisu zadania:", err);
      setError("Nie udało się zapisać zadania");
    } finally {
      setSavingId(null);
    }
  };

  const handleChangeStatus = async (task: Task, nextStatus: TaskStatus) => {
    // reguła: tylko do przodu
    const order: TaskStatus[] = ["pending", "in_progress", "done"];
    const curIdx = order.indexOf(task.status);
    const nextIdx = order.indexOf(nextStatus);
    if (nextIdx < curIdx) return; // blokada cofania

    try {
      setSavingId(task.id);
      setError(null);
      const updated = await api.updateTask(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? (updated as Task) : t)));
    } catch (err) {
      console.error("❌ Błąd zmiany statusu zadania:", err);
      setError("Nie udało się zmienić statusu");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm("Na pewno chcesz usunąć to zadanie?")) return;
    try {
      setSavingId(task.id);
      setError(null);
      await api.deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      console.error("❌ Błąd usuwania zadania:", err);
      setError("Nie udało się usunąć zadania");
    } finally {
      setSavingId(null);
    }
  };

  // filtrowanie
  const filteredTasks = useMemo(() => {
  return tasks.filter((t) => {
    // Status: jeśli set pusty => wszystkie
    if (statusFilter.size > 0 && !statusFilter.has(t.status)) return false;

    // Kategoria: jeśli set pusty => wszystkie
    if (categoryFilter.size > 0) {
      if (!t.category) return false;
      if (!categoryFilter.has(t.category)) return false;
    }

    return true;
  });
}, [tasks, statusFilter, categoryFilter]);


  // timeline: grupowanie po miesiącu due_date
  const timelineGroups = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    const noDate: Task[] = [];

    for (const t of filteredTasks) {
      const d = parseDate(t.due_date);
      if (!d) {
        noDate.push(t);
        continue;
      }
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }

    const sortedKeys = Object.keys(groups).sort();
    return { groups, keys: sortedKeys, noDate };
  }, [filteredTasks]);

  // kalendarz: siatka
  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { date: Date | null; tasks: Task[] }[] = [];

    for (let i = 1; i < firstWeekday; i++) cells.push({ date: null, tasks: [] });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().slice(0, 10);

      const tasksForDay = filteredTasks.filter((t) => {
        const d = parseDate(t.due_date);
        if (!d) return false;
        return d.toISOString().slice(0, 10) === dateKey;
      });

      cells.push({ date, tasks: tasksForDay });
    }

    while (cells.length % 7 !== 0) cells.push({ date: null, tasks: [] });

    return { year, month, cells };
  }, [calendarMonth, filteredTasks]);

  const calendarWeeks = useMemo(() => {
    const weeks: { date: Date | null; tasks: Task[] }[][] = [];
    for (let i = 0; i < calendarData.cells.length; i += 7) {
      weeks.push(calendarData.cells.slice(i, i + 7));
    }
    return weeks;
  }, [calendarData]);

  const changeMonth = (delta: number) => {
    setCalendarMonth((prev) => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return new Date(y, m + delta, 1);
    });
  };

  const statusOptions: TaskStatus[] = ["pending", "in_progress", "done"];
const categoryOptions: TaskCategory[] = [
  "FORMALNOSCI",
  "ORGANIZACJA",
  "USLUGI",
  "DEKORACJE",
  "LOGISTYKA",
  "DZIEN_SLUBU",
];

  const weekDayLabels = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

  const FiltersHeader = () => (
    <div className="mb-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold">Filtry</span>
          <span className={chip}>{filteredTasks.length} szt.</span>
          {loading && (
            <span className="text-xs text-white/55 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Wczytywanie…
            </span>
          )}
        </div>

        <button type="button" onClick={openCreate} className={btnGold}>
          <Plus className="w-4 h-4" />
          Dodaj zadanie
        </button>
      </div>

      {/* Statusy */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
  {/* Wszystkie = reset */}
  <button
    type="button"
    onClick={() => setStatusFilter(new Set())}
    className={
      "px-3 py-1 rounded-full border text-xs transition " +
      (statusFilter.size === 0
        ? "border-[#c8a04b]/40 bg-[#c8a04b]/10 text-white"
        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8")
    }
  >
    Wszystkie
  </button>

  {statusOptions.map((s) => {
    const active = statusFilter.has(s);
    return (
      <button
        key={s}
        type="button"
        onClick={() => {
          setStatusFilter((prev) => {
            const next = new Set(prev);
            if (next.has(s)) next.delete(s);
            else next.add(s);
            return next;
          });
        }}
        className={
          "px-3 py-1 rounded-full border text-xs transition " +
          (active
            ? "border-[#c8a04b]/40 bg-[#c8a04b]/10 text-white"
            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8")
        }
      >
        {STATUS_LABELS[s]}
      </button>
    );
  })}
</div>


      {/* Kategorie */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
  {/* Wszystkie = reset */}
  <button
    type="button"
    onClick={() => setCategoryFilter(new Set())}
    className={
      "px-3 py-1 rounded-full border text-xs transition " +
      (categoryFilter.size === 0
        ? "border-[#c8a04b]/40 bg-[#c8a04b]/10 text-white"
        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8")
    }
  >
    Wszystkie
  </button>

  {categoryOptions.map((c) => {
    const active = categoryFilter.has(c);
    return (
      <button
        key={c}
        type="button"
        onClick={() => {
          setCategoryFilter((prev) => {
            const next = new Set(prev);
            if (next.has(c)) next.delete(c);
            else next.add(c);
            return next;
          });
        }}
        className={
          "px-3 py-1 rounded-full border text-xs transition " +
          (active
            ? "border-[#c8a04b]/40 bg-[#c8a04b]/10 text-white"
            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8")
        }
      >
        {CATEGORY_LABELS[c]}
      </button>
    );
  })}
</div>

    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
            <ListChecks className="w-5 h-5 text-[#d7b45a]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Zadania</h2>
            <p className="text-sm text-white/60">
              Zaplanuj wszystkie kroki – od formalności po dzień ślubu.
            </p>
          </div>
        </div>

        {/* View switch */}
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 rounded-full flex items-center gap-2 transition ${
              viewMode === "list" ? "bg-[#c8a04b]/15 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={`px-3 py-1 rounded-full flex items-center gap-2 transition ${
              viewMode === "timeline" ? "bg-[#c8a04b]/15 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            <Clock className="w-3 h-3" />
            Oś czasu
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`px-3 py-1 rounded-full flex items-center gap-2 transition ${
              viewMode === "calendar" ? "bg-[#c8a04b]/15 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            <Calendar className="w-3 h-3" />
            Kalendarz
          </button>
        </div>
      </div>

      {error && (
        <div className={`${cardBase} p-4 mb-4 border-red-500/20 bg-red-500/10`}>
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* LIST */}
      {viewMode === "list" && (
        <div className={cardBase + " p-6 md:p-7"}>
          <FiltersHeader />

          {/* table header */}
          <div className="hidden lg:grid grid-cols-[180px_140px_220px_1fr_170px_140px] gap-3 px-3 py-2 text-xs text-white/60 border-b border-white/10">
            <div>Status</div>
            <div>Termin</div>
            <div>Tytuł</div>
            <div>Opis</div>
            <div>Kategoria</div>
            <div className="text-right">Akcje</div>
          </div>

          {filteredTasks.length === 0 && !loading && (
            <p className="text-sm text-white/55 mt-4">
              Brak zadań spełniających filtry. Dodaj zadanie lub zmień filtry.
            </p>
          )}

          <div className="space-y-2 mt-3">
            {filteredTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-white/10 bg-white/4 p-3">
                <div className="grid grid-cols-1 lg:grid-cols-[180px_140px_220px_1fr_170px_140px] gap-3 items-start">
                  {/* Status */}
                  <div className="flex items-center">
                    <TaskStatusInline
                      value={task.status}
                      isSaving={savingId === task.id}
                      forwardOnly={true}
                      onChange={(next) => handleChangeStatus(task, next)}
                    />
                  </div>

                  {/* Termin */}
                  <div className="text-sm text-white/80">
                    {task.due_date ? formatDisplayDate(task.due_date) : "—"}
                  </div>

                  {/* Tytuł */}
                  <div className="text-sm text-white font-semibold break-words">
                    {task.title}
                  </div>

                  {/* Opis */}
                  <div className="text-sm text-white/60 break-words">
                    {task.description ? task.description : "—"}
                  </div>

                  {/* Kategoria */}
                  <div className="text-sm text-white/80">
                    {task.category ? CATEGORY_LABELS[task.category] : "—"}
                  </div>

                  {/* Akcje */}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-white hover:bg-white/10 transition"
                      title="Edytuj"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task)}
                      className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-red-200 hover:bg-white/10 transition"
                      title="Usuń"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* mobile info */}
                <div className="lg:hidden mt-3 pt-3 border-t border-white/10 text-xs text-white/60 flex flex-wrap gap-3">
                  <span>
                    Termin:{" "}
                    <span className="text-white/80">
                      {task.due_date ? formatDisplayDate(task.due_date) : "—"}
                    </span>
                  </span>
                  <span>
                    Kategoria:{" "}
                    <span className="text-white/80">
                      {task.category ? CATEGORY_LABELS[task.category] : "—"}
                    </span>
                  </span>
                  <span>
                    Status:{" "}
                    <span className="text-white/80">{STATUS_LABELS[task.status]}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIMELINE */}
      {viewMode === "timeline" && (
        <div className={cardBase + " p-6 md:p-7"}>
          <FiltersHeader />

          {timelineGroups.keys.length === 0 && timelineGroups.noDate.length === 0 && (
            <p className="text-sm text-white/55">
              Brak zadań z datami. Ustaw terminy w widoku listy, aby zobaczyć oś czasu.
            </p>
          )}

          <div className="space-y-5">
            {timelineGroups.keys.map((key) => {
              const [year, month] = key.split("-");
              const date = new Date(Number(year), Number(month) - 1, 1);
              const label = date.toLocaleDateString("pl-PL", { year: "numeric", month: "long" });
              const tasksInGroup = timelineGroups.groups[key];

              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#d7b45a]" />
                    <h4 className="text-sm font-semibold text-white">{label}</h4>
                  </div>

                  <div className="ml-3 space-y-2">
                    {tasksInGroup
                      .slice()
                      .sort(
                        (a, b) =>
                          (parseDate(a.due_date)?.getTime() ?? 0) -
                          (parseDate(b.due_date)?.getTime() ?? 0)
                      )
                      .map((task) => (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-white/10 bg-white/4 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <TaskStatusInline
                                value={task.status}
                                isSaving={savingId === task.id}
                                forwardOnly={true}
                                onChange={(next) => handleChangeStatus(task, next)}
                              />
                              <span className="font-semibold text-white truncate">{task.title}</span>
                              {task.category && <span className={chip}>{CATEGORY_LABELS[task.category]}</span>}
                              <span className="text-xs text-white/55">{formatDisplayDate(task.due_date)}</span>
                            </div>
                            {task.description && (
                              <p className="text-sm text-white/60 mt-2 break-words">{task.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(task)}
                              className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-white hover:bg-white/10 transition"
                              title="Edytuj"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task)}
                              className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-red-200 hover:bg-white/10 transition"
                              title="Usuń"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}

            {timelineGroups.noDate.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-white/30" />
                  <h4 className="text-sm font-semibold text-white">Bez ustalonego terminu</h4>
                </div>

                <div className="ml-3 space-y-2">
                  {timelineGroups.noDate.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-white/10 bg-white/4 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <TaskStatusInline
                            value={task.status}
                            isSaving={savingId === task.id}
                            forwardOnly={true}
                            onChange={(next) => handleChangeStatus(task, next)}
                          />
                          <span className="font-semibold text-white truncate">{task.title}</span>
                          {task.category && <span className={chip}>{CATEGORY_LABELS[task.category]}</span>}
                          <span className="text-xs text-white/55">Brak terminu</span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-white/60 mt-2 break-words">{task.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(task)}
                          className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-white hover:bg-white/10 transition"
                          title="Edytuj"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task)}
                          className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-red-200 hover:bg-white/10 transition"
                          title="Usuń"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CALENDAR */}
      {viewMode === "calendar" && (
        <div className={cardBase + " p-6 md:p-7"}>
          <FiltersHeader />

          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-white font-semibold">Kalendarz zadań</h3>

            <div className="flex items-center gap-2 text-xs">
              <button type="button" onClick={() => changeMonth(-1)} className={btnSecondary}>
                ← Poprzedni
              </button>
              <span className={chip}>
                {String(calendarMonth.getMonth() + 1).padStart(2, "0")}/{calendarMonth.getFullYear()}
              </span>
              <button type="button" onClick={() => changeMonth(1)} className={btnSecondary}>
                Następny →
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/10">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5">
                    {weekDayLabels.map((d) => (
                      <th key={d} className="border-b border-white/10 py-3 text-center font-semibold text-white/70">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendarWeeks.map((week, weekIndex) => (
                    <tr key={weekIndex} className="h-[96px]">
                      {week.map((cell, idx) => {
                        if (!cell.date) {
                          return (
                            <td
                              key={`empty-${weekIndex}-${idx}`}
                              className="align-top border border-white/5 bg-white/2"
                            />
                          );
                        }

                        const day = cell.date.getDate();
                        const hasTasks = cell.tasks.length > 0;
                        const dateKey = cell.date.toISOString().slice(0, 10);
                        const isSelected = selectedDateKey === dateKey;

                        return (
                          <td
                            key={cell.date.toISOString()}
                            onClick={() => setSelectedDateKey(dateKey)}
                            className={
                              "align-top border border-white/5 p-2 cursor-pointer transition " +
                              (isSelected
                                ? "bg-[#c8a04b]/12 border-[#c8a04b]/25"
                                : hasTasks
                                ? "bg-white/4"
                                : "bg-transparent") +
                              " hover:bg-[#c8a04b]/10"
                            }
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-semibold text-white/80">{day}</span>
                              {hasTasks && <span className="text-[11px] text-[#d7b45a]">{cell.tasks.length} zad.</span>}
                            </div>

                            <div className="space-y-1">
                              {cell.tasks.slice(0, 2).map((task) => (
                                <div
                                  key={task.id}
                                  className="rounded-lg px-2 py-1 bg-black/20 border border-white/10 text-[11px] text-white/80 truncate"
                                  title={task.title}
                                >
                                  {task.title}
                                </div>
                              ))}
                              {cell.tasks.length > 2 && (
                                <div className="text-[11px] text-white/55">
                                  +{cell.tasks.length - 2} więcej
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Szczegóły dnia */}
          {selectedDateKey && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/4 p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">
                  Zadania na dzień{" "}
                  <span className="text-[#d7b45a]">
                    {new Date(selectedDateKey).toLocaleDateString("pl-PL", {
                      year: "numeric",
                      month: "long",
                      day: "2-digit",
                    })}
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedDateKey(null)}
                  className="text-xs text-white/55 hover:text-white"
                >
                  Wyczyść
                </button>
              </div>

              <div className="space-y-2">
                {filteredTasks
                  .filter((t) => {
                    const d = parseDate(t.due_date);
                    if (!d) return false;
                    return d.toISOString().slice(0, 10) === selectedDateKey;
                  })
                  .map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <TaskStatusInline
                            value={task.status}
                            isSaving={savingId === task.id}
                            forwardOnly={true}
                            onChange={(next) => handleChangeStatus(task, next)}
                          />
                          <span className="font-semibold text-white">{task.title}</span>
                          {task.category && <span className={chip}>{CATEGORY_LABELS[task.category]}</span>}
                        </div>
                        {task.description && (
                          <p className="text-sm text-white/60 mt-2 break-words">{task.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(task)}
                          className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-white hover:bg-white/10 transition"
                          title="Edytuj"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task)}
                          className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-red-200 hover:bg-white/10 transition"
                          title="Usuń"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                {filteredTasks.filter((t) => {
                  const d = parseDate(t.due_date);
                  if (!d) return false;
                  return d.toISOString().slice(0, 10) === selectedDateKey;
                }).length === 0 && (
                  <p className="text-sm text-white/55">Brak zadań przypisanych do tego dnia.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* modal create/edit */}
      <TaskCreateEditModal
        open={modalOpen}
        mode={modalMode}
        initialTask={editingTask}
        saving={savingId === "modal"}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}
