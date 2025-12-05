import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, CheckSquare, Clock, ListChecks } from "lucide-react";
import { api } from "../lib/api";
import type { Task, TaskCategory, TaskStatus, TaskPayload } from "../types/task";

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
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">(
    "all"
  );

  // do kreatora prostych zadań
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] =
    useState<TaskCategory>("FORMALNOSCI");
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>("");

  // dla kalendarza
    const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // 🔹 aktualnie wybrany dzień w kalendarzu (format YYYY-MM-DD)
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);


  

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
        // gdyby backend zwrócił jedno zadanie:
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
      const updated = await api.updateTask(task.id, {
        status: nextStatus,
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? (updated as Task) : t))
      );
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
      const updated = await api.updateTask(task.id, {
        due_date: newDate || null,
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? (updated as Task) : t))
      );
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

  // FILTROWANIE
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter)
        return false;
      return true;
    });
  }, [tasks, statusFilter, categoryFilter]);

  // TIMELINE: grupowanie po miesiącu due_date
  const timelineGroups = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    const noDate: Task[] = [];

    for (const t of filteredTasks) {
      const d = parseDate(t.due_date);
      if (!d) {
        noDate.push(t);
        continue;
      }
      const key = `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }

    const sortedKeys = Object.keys(groups).sort();
    return {
      groups,
      keys: sortedKeys,
      noDate,
    };
  }, [filteredTasks]);

  // KALENDARZ: zadania wg dni
   const calendarData = useMemo(() => {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth(); // 0-11
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // 1-7, pon=1
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date | null; tasks: Task[] }[] = [];

  // puste przed początkiem miesiąca
  for (let i = 1; i < firstWeekday; i++) {
    cells.push({ date: null, tasks: [] });
  }

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

  // DOPEŁNIENIE DO WIELOKROTNOŚCI 7
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, tasks: [] });
  }

  return {
    year,
    month,
    cells,
  };
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
    <div className="min-h-screen bg-slate-50 px-4 py-6 flex justify-center">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-md p-6 md:p-8">
        {/* Nagłówek */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <ListChecks className="w-6 h-6 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold">Harmonogram zadań</h1>
              <p className="text-sm text-slate-500">
                Zaplanuj wszystkie kroki związane ze ślubem – od formalności po dzień ślubu.
              </p>
            </div>
          </div>

          {/* Tryb widoku */}
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded-full flex items-center gap-1 ${
                viewMode === "list"
                  ? "bg-white shadow text-indigo-700"
                  : "text-slate-500"
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1 rounded-full flex items-center gap-1 ${
                viewMode === "timeline"
                  ? "bg-white shadow text-indigo-700"
                  : "text-slate-500"
              }`}
            >
              <Clock className="w-3 h-3" />
              Oś czasu
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1 rounded-full flex items-center gap-1 ${
                viewMode === "calendar"
                  ? "bg-white shadow text-indigo-700"
                  : "text-slate-500"
              }`}
            >
              <Calendar className="w-3 h-3" />
              Kalendarz
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Filtry */}
        <section className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <h2 className="font-semibold mb-1">Status</h2>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full border ${
                    statusFilter === s
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {s === "all" ? "Wszystkie" : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-1">Kategoria</h2>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1 rounded-full border ${
                    categoryFilter === c
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {c === "all" ? "Wszystkie" : CATEGORY_LABELS[c as TaskCategory]}
                </button>
              ))}
            </div>
          </div>

          {/* Szybkie dodanie zadania */}
          <div>
            <h2 className="font-semibold mb-1">Szybkie dodanie zadania</h2>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Tytuł zadania..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
              />
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  value={newTaskCategory}
                  onChange={(e) =>
                    setNewTaskCategory(e.target.value as TaskCategory)
                  }
                >
                  {(
                    [
                      "FORMALNOSCI",
                      "ORGANIZACJA",
                      "USLUGI",
                      "DEKORACJE",
                      "LOGISTYKA",
                      "DZIEN_SLUBU",
                    ] as TaskCategory[]
                  ).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-[130px] rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateTask}
                disabled={savingId === "new"}
                className="w-full rounded-lg bg-indigo-600 text-white py-1 text-xs hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingId === "new" ? "Dodawanie..." : "Dodaj zadanie"}
              </button>
            </div>
          </div>
        </section>

        {/* Widoki */}
        {viewMode === "list" && (
          <section>
            <h2 className="text-sm font-semibold mb-2">
              Lista zadań ({filteredTasks.length})
            </h2>
            {loading && (
              <p className="text-xs text-slate-500 mb-2">
                Wczytywanie zadań...
              </p>
            )}
            {filteredTasks.length === 0 && !loading && (
              <p className="text-xs text-slate-500">
                Brak zadań spełniających wybrane filtry. Dodaj zadanie lub
                zmień filtry.
              </p>
            )}
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(task)}
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${
                          task.status === "done"
                            ? "bg-emerald-500 border-emerald-500"
                            : task.status === "in_progress"
                            ? "bg-amber-100 border-amber-400"
                            : "bg-white border-slate-300"
                        }`}
                      >
                        {task.status === "done" && (
                          <span className="text-[10px] text-white">✓</span>
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {task.title}
                          </span>
                          {task.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {CATEGORY_LABELS[task.category]}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {STATUS_LABELS[task.status]}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-slate-500 mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-slate-500">
                      <span>{formatDisplayDate(task.due_date)}</span>
                      <input
                        type="date"
                        value={formatDateInputValue(task.due_date)}
                        onChange={(e) =>
                          handleUpdateTaskDate(task, e.target.value)
                        }
                        className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task)}
                        className="text-[11px] text-slate-400 hover:text-red-500"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {viewMode === "timeline" && (
          <section>
            <h2 className="text-sm font-semibold mb-2">Oś czasu</h2>
            {timelineGroups.keys.length === 0 &&
              timelineGroups.noDate.length === 0 && (
                <p className="text-xs text-slate-500">
                  Brak zadań z przypisanymi datami. Ustaw daty w widoku listy,
                  aby zobaczyć oś czasu.
                </p>
              )}

            <div className="space-y-4">
              {timelineGroups.keys.map((key) => {
                const [year, month] = key.split("-");
                const date = new Date(
                  Number(year),
                  Number(month) - 1,
                  1
                );
                const label = date.toLocaleDateString("pl-PL", {
                  year: "numeric",
                  month: "long",
                });
                const tasksInGroup = timelineGroups.groups[key];

                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <h3 className="text-xs font-semibold text-slate-700">
                        {label}
                      </h3>
                    </div>
                    <div className="ml-4 space-y-2">
                      {tasksInGroup
                        .slice()
                        .sort((a, b) => {
                          const da = parseDate(a.due_date)?.getTime() ?? 0;
                          const db = parseDate(b.due_date)?.getTime() ?? 0;
                          return da - db;
                        })
                        .map((task) => (
                          <div
                            key={task.id}
                            className="border border-slate-200 rounded-lg p-2 flex justify-between gap-2 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {task.title}
                                </span>
                                {task.category && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                    {CATEGORY_LABELS[task.category]}
                                  </span>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 text-right">
                              <div>{formatDisplayDate(task.due_date)}</div>
                              <div>{STATUS_LABELS[task.status]}</div>
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
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <h3 className="text-xs font-semibold text-slate-700">
                      Bez ustalonego terminu
                    </h3>
                  </div>
                  <div className="ml-4 space-y-2">
                    {timelineGroups.noDate.map((task) => (
                      <div
                        key={task.id}
                        className="border border-slate-200 rounded-lg p-2 flex justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{task.title}</span>
                            {task.category && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {CATEGORY_LABELS[task.category]}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 text-right">
                          {STATUS_LABELS[task.status]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {viewMode === "calendar" && (
  <section>
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold">Kalendarz zadań</h2>
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          ← Poprzedni
        </button>
        <span className="font-medium text-slate-700">
          {calendarMonth.getMonth() + 1 < 10 ? "0" : ""}
          {calendarMonth.getMonth() + 1}/{calendarMonth.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          Następny →
        </button>
      </div>
    </div>

    {/* Ramka wokół kalendarza */}
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto text-[11px] bg-white">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {weekDayLabels.map((d) => (
                <th
                  key={d}
                  className="border-b border-slate-200 py-2 text-center font-medium text-slate-600"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendarWeeks.map((week, weekIndex) => (
              <tr key={weekIndex} className="h-[90px]">
                {week.map((cell, idx) => {
                  if (!cell.date) {
                    return (
                      <td
                        key={`empty-${weekIndex}-${idx}`}
                        className="align-top border border-slate-100 bg-slate-50/40"
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
                      className={`align-top border border-slate-100 p-1 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-300"
                          : hasTasks
                          ? "bg-slate-50"
                          : "bg-white"
                      } hover:bg-indigo-50/60`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {day}
                        </span>
                        {hasTasks && (
                          <span className="text-[10px] text-indigo-600">
                            {cell.tasks.length} zad.
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {cell.tasks.slice(0, 2).map((task) => (
                          <div
                            key={task.id}
                            className="rounded px-1 py-[1px] bg-white text-[10px] text-slate-700 border border-slate-200 truncate"
                            title={task.title}
                          >
                            {task.title}
                          </div>
                        ))}
                        {cell.tasks.length > 2 && (
                          <div className="text-[10px] text-slate-500">
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

    {/* Szczegóły wybranego dnia */}
    {selectedDateKey && (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-700">
            Zadania na dzień{" "}
            {new Date(selectedDateKey).toLocaleDateString("pl-PL", {
              year: "numeric",
              month: "long",
              day: "2-digit",
            })}
          </h3>
          <button
            type="button"
            onClick={() => setSelectedDateKey(null)}
            className="text-[11px] text-slate-500 hover:text-slate-700"
          >
            Wyczyść
          </button>
        </div>
        <div className="space-y-2 text-xs">
          {filteredTasks
            .filter((t) => {
              const d = parseDate(t.due_date);
              if (!d) return false;
              return d.toISOString().slice(0, 10) === selectedDateKey;
            })
            .map((task) => (
              <div
                key={task.id}
                className="rounded-lg bg-white border border-slate-200 p-2 flex justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{task.title}</span>
                    {task.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {CATEGORY_LABELS[task.category]}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {task.description}
                    </p>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 text-right">
                  <div>{STATUS_LABELS[task.status]}</div>
                </div>
              </div>
            ))}
          {filteredTasks.filter((t) => {
            const d = parseDate(t.due_date);
            if (!d) return false;
            return d.toISOString().slice(0, 10) === selectedDateKey;
          }).length === 0 && (
            <p className="text-[11px] text-slate-500">
              Brak zadań przypisanych do tego dnia.
            </p>
          )}
        </div>
      </div>
    )}

    {filteredTasks.length === 0 && !loading && (
      <p className="mt-3 text-xs text-slate-500">
        Brak zadań spełniających filtry – dodaj zadanie w widoku listy.
      </p>
    )}
  </section>
)}




      </div>
    </div>
  );
}
