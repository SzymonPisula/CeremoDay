import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, CheckSquare, Clock, ListChecks, Loader2, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { Task, TaskCategory, TaskStatus, TaskPayload } from "../types/task";
import Select from "../ui/Select";
import DatePicker from "../ui/DatePicker";

type Params = {
  id: string;
};

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

// Format jak "2025-02-15"
function formatDateInputValue(dateStr?: string | null): string {
  const d = parseDate(dateStr);
  if (!d) return "";
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr?: string | null): string {
  const d = parseDate(dateStr);
  if (!d) return "Brak terminu";
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

  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");

  // szybkie dodanie
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>("FORMALNOSCI");
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>("");

  // kalendarz
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // === UI helpers: CeremoDay CRM vibe ===
  const inputBase =
    "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/35 " +
    "outline-none focus:border-[#c8a04b]/50 focus:ring-2 focus:ring-[#c8a04b]/15 transition";



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

  const handleCreateTask = async () => {
    if (!eventId) return;
    if (!newTaskTitle.trim()) {
      alert("Podaj tytuł zadania");
      return;
    }

    const payload: TaskPayload = {
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      status: "pending",
      due_date: newTaskDueDate || undefined,
    };

    try {
      setSavingId("new");
      setError(null);
      const created = await api.createTask(eventId, payload);
      setTasks((prev) => {
        const arr = Array.isArray(created) ? created : [created];
        return arr.length === 1 ? [...prev, arr[0]] : [...prev, ...arr];
      });
      setNewTaskTitle("");
      setNewTaskDueDate("");
    } catch (err) {
      console.error("❌ Błąd tworzenia zadania:", err);
      setError("Nie udało się dodać zadania");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus: TaskStatus =
      task.status === "pending"
        ? "in_progress"
        : task.status === "in_progress"
        ? "done"
        : "pending";

    try {
      setSavingId(task.id);
      const updated = await api.updateTask(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? (updated as Task) : t)));
    } catch (err) {
      console.error("❌ Błąd zmiany statusu zadania:", err);
      setError("Nie udało się zmienić statusu");
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateTaskDate = async (task: Task, newDate: string) => {
    try {
      setSavingId(task.id);
      const updated = await api.updateTask(task.id, { due_date: newDate || null });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? (updated as Task) : t)));
    } catch (err) {
      console.error("❌ Błąd zmiany daty zadania:", err);
      setError("Nie udało się zmienić daty zadania");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm("Na pewno chcesz usunąć to zadanie?")) return;
    try {
      setSavingId(task.id);
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
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
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
    const month = calendarMonth.getMonth(); // 0-11
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // 1-7, pon=1
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

  const statusOptions: (TaskStatus | "all")[] = ["all", "pending", "in_progress", "done"];
  const categoryOptions: (TaskCategory | "all")[] = [
    "all",
    "FORMALNOSCI",
    "ORGANIZACJA",
    "USLUGI",
    "DEKORACJE",
    "LOGISTYKA",
    "DZIEN_SLUBU",
  ];
  const weekDayLabels = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

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
            <CheckSquare className="w-3 h-3" />
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

      {/* Filters + quick add */}
      <div className={`${cardBase} p-6 md:p-7 mb-6`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Status */}
          <div>
            <div className="text-white font-semibold mb-2">Status</div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={
                    "px-3 py-1 rounded-full border text-xs transition " +
                    (statusFilter === s
                      ? "border-[#c8a04b]/40 bg-[#c8a04b]/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8")
                  }
                >
                  {s === "all" ? "Wszystkie" : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="text-white font-semibold mb-2">Kategoria</div>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={
                    "px-3 py-1 rounded-full border text-xs transition " +
                    (categoryFilter === c
                      ? "border-[#c8a04b]/40 bg-[#c8a04b]/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8")
                  }
                >
                  {c === "all" ? "Wszystkie" : CATEGORY_LABELS[c as TaskCategory]}
                </button>
              ))}
            </div>
          </div>

          {/* Quick add */}
          <div>
            <div className="text-white font-semibold mb-2">Szybkie dodanie</div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Tytuł zadania…"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className={inputBase}
              />
              <div className="flex gap-2">
                <Select<TaskCategory>
  value={newTaskCategory}
  onChange={(v) => setNewTaskCategory(v)}
  options={[
    { value: "FORMALNOSCI", label: CATEGORY_LABELS.FORMALNOSCI },
    { value: "ORGANIZACJA", label: CATEGORY_LABELS.ORGANIZACJA },
    { value: "USLUGI", label: CATEGORY_LABELS.USLUGI },
    { value: "DEKORACJE", label: CATEGORY_LABELS.DEKORACJE },
    { value: "LOGISTYKA", label: CATEGORY_LABELS.LOGISTYKA },
    { value: "DZIEN_SLUBU", label: CATEGORY_LABELS.DZIEN_SLUBU },
  ]}
/>

<div className="w-[180px]">
  <DatePicker
    value={newTaskDueDate}
    onChange={setNewTaskDueDate}
    placeholder="Termin"
    className="w-full"
    buttonClassName="py-2 text-sm"
  />
</div>



              </div>

              <button
                type="button"
                onClick={handleCreateTask}
                disabled={savingId === "new"}
                className={btnGold + " w-full"}
              >
                {savingId === "new" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Dodawanie…
                  </>
                ) : (
                  "Dodaj zadanie"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Views */}
      {viewMode === "list" && (
        <div className={cardBase + " p-6 md:p-7"}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Lista zadań</h3>
            <span className={chip}>{filteredTasks.length} szt.</span>
          </div>

          {loading && (
            <div className="text-xs text-white/55 mb-3 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Wczytywanie…
            </div>
          )}

          {filteredTasks.length === 0 && !loading && (
            <p className="text-sm text-white/55">
              Brak zadań spełniających filtry. Dodaj zadanie lub zmień filtry.
            </p>
          )}

          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(task)}
                      className={
                        "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition " +
                        (task.status === "done"
                          ? "bg-emerald-500/80 border-emerald-400/60"
                          : task.status === "in_progress"
                          ? "bg-amber-400/15 border-amber-300/40"
                          : "bg-white/5 border-white/10 hover:bg-white/10")
                      }
                      title="Zmień status"
                    >
                      {task.status === "done" ? (
                        <span className="text-[11px] text-white">✓</span>
                      ) : task.status === "in_progress" ? (
                        <span className="text-[10px] text-amber-200">•</span>
                      ) : null}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{task.title}</span>
                        {task.category && <span className={chip}>{CATEGORY_LABELS[task.category]}</span>}
                        <span className="text-xs text-white/55">{STATUS_LABELS[task.status]}</span>
                        {savingId === task.id && (
                          <span className="text-xs text-white/45 inline-flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            zapis…
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-white/60 mt-2">{task.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2">
                    <div className="text-xs text-white/55">{formatDisplayDate(task.due_date)}</div>
                    <DatePicker
                      value={formatDateInputValue(task.due_date)}
                      onChange={(v) => handleUpdateTaskDate(task, v)}
                      className="w-[220px]"
                      buttonClassName="py-2 text-sm"
                    />




                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task)}
                      className="inline-flex items-center gap-2 text-xs text-white/55 hover:text-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      Usuń
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === "timeline" && (
        <div className={cardBase + " p-6 md:p-7"}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Oś czasu</h3>
            <span className={chip}>
              {timelineGroups.keys.length + (timelineGroups.noDate.length ? 1 : 0)} grup
            </span>
          </div>

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
                      .sort((a, b) => (parseDate(a.due_date)?.getTime() ?? 0) - (parseDate(b.due_date)?.getTime() ?? 0))
                      .map((task) => (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-white/10 bg-white/4 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-white truncate">{task.title}</span>
                              {task.category && <span className={chip}>{CATEGORY_LABELS[task.category]}</span>}
                              <span className="text-xs text-white/55">{STATUS_LABELS[task.status]}</span>
                            </div>
                            {task.description && (
                              <p className="text-sm text-white/60 mt-1">{task.description}</p>
                            )}
                          </div>

                          <div className="text-xs text-white/55 md:text-right">
                            {formatDisplayDate(task.due_date)}
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
                          <span className="font-semibold text-white truncate">{task.title}</span>
                          {task.category && <span className={chip}>{CATEGORY_LABELS[task.category]}</span>}
                          <span className="text-xs text-white/55">{STATUS_LABELS[task.status]}</span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-white/60 mt-1">{task.description}</p>
                        )}
                      </div>

                      <div className="text-xs text-white/55 md:text-right">
                        Brak terminu
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "calendar" && (
        <div className={cardBase + " p-6 md:p-7"}>
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
                          <span className="font-semibold text-white">{task.title}</span>
                          {task.category && <span className={chip}>{CATEGORY_LABELS[task.category]}</span>}
                        </div>
                        {task.description && (
                          <p className="text-sm text-white/60 mt-2">{task.description}</p>
                        )}
                      </div>
                      <div className="text-xs text-white/55">{STATUS_LABELS[task.status]}</div>
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

          {filteredTasks.length === 0 && !loading && (
            <p className="mt-4 text-sm text-white/55">
              Brak zadań spełniających filtry – dodaj zadanie w widoku listy.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
