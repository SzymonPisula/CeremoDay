// CeremoDay/web/src/pages/Notifications.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  Clock,
  Calendar,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

import PageLayout from "../layout/PageLayout";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { api } from "../lib/api";
import type { Task, TaskCategory } from "../types/task";

type Params = { id?: string };

type CeremonyType = "CIVIL" | "CHURCH" | "RECEPTION_ONLY";
type NotifLevel = "danger" | "warn" | "info";

type UiNotification = {
  id: string;
  level: NotifLevel;
  title: string;
  message: string;
  dateISO: string; // YYYY-MM-DD
  dateLabel: string; // "Dziś", "Jutro", "Za 3 dni", "3 dni temu"
  taskId: string;
  taskCategory?: TaskCategory | null;
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysDiff(a: Date, b: Date) {
  // b - a w dniach (a i b powinny być startOfDay)
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function formatPlDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });
}

function buildNotifications(tasks: Task[], ceremonyType: CeremonyType | null): UiNotification[] {
  const today = startOfDay(new Date());
  const todayISO = toISODate(today);

  const tomorrow = startOfDay(new Date(today));
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = toISODate(tomorrow);

  const weekEnd = startOfDay(new Date(today));
  weekEnd.setDate(weekEnd.getDate() + 7);

  const notifs: UiNotification[] = [];

  for (const t of tasks) {
    if (!t) continue;
    if (t.status === "done") continue;
    if (!t.due_date) continue;

    // ✅ wpływ wywiadu: RECEPTION_ONLY = nie spamujemy formalnościami
    if (ceremonyType === "RECEPTION_ONLY" && t.category === "FORMALNOSCI") continue;

    const due = startOfDay(new Date(t.due_date));
    if (Number.isNaN(due.getTime())) continue;

    const dueISO = toISODate(due);
    const diff = daysDiff(today, due);

    // OVERDUE
    if (due < today) {
      notifs.push({
        id: `overdue:${t.id}`,
        level: "danger",
        title: "Zaległe zadanie",
        message: t.title,
        dateISO: dueISO,
        dateLabel: diff === -1 ? "Wczoraj" : `${Math.abs(diff)} dni temu`,
        taskId: t.id,
        taskCategory: t.category ?? null,
      });
      continue;
    }

    // TODAY
    if (dueISO === todayISO) {
      notifs.push({
        id: `today:${t.id}`,
        level: "warn",
        title: "Termin dzisiaj",
        message: t.title,
        dateISO: dueISO,
        dateLabel: "Dziś",
        taskId: t.id,
        taskCategory: t.category ?? null,
      });
      continue;
    }

    // TOMORROW
    if (dueISO === tomorrowISO) {
      notifs.push({
        id: `tomorrow:${t.id}`,
        level: "warn",
        title: "Termin jutro",
        message: t.title,
        dateISO: dueISO,
        dateLabel: "Jutro",
        taskId: t.id,
        taskCategory: t.category ?? null,
      });
      continue;
    }

    // SOON (<= 7 dni)
    if (due <= weekEnd) {
      notifs.push({
        id: `soon:${t.id}`,
        level: "info",
        title: "Zbliża się termin",
        message: t.title,
        dateISO: dueISO,
        dateLabel: `Za ${diff} dni`,
        taskId: t.id,
        taskCategory: t.category ?? null,
      });
    }
  }

  // sort: danger -> warn -> info, potem data rosnąco
  const prio: Record<NotifLevel, number> = { danger: 0, warn: 1, info: 2 };

  notifs.sort((a, b) => {
    const p = prio[a.level] - prio[b.level];
    if (p !== 0) return p;

    const d = a.dateISO.localeCompare(b.dateISO);
    if (d !== 0) return d;

    return a.message.localeCompare(b.message);
  });

  return notifs;
}

function levelChip(level: NotifLevel) {
  if (level === "danger") {
    return {
      cls: "border-red-400/20 bg-red-500/10 text-red-100/90",
      label: "Pilne",
      icon: <AlertTriangle className="w-4 h-4" />,
    };
  }
  if (level === "warn") {
    return {
      cls: "border-[#d7b45a]/25 bg-[#d7b45a]/10 text-white/85",
      label: "Ważne",
      icon: <Clock className="w-4 h-4 text-[#d7b45a]" />,
    };
  }
  return {
    cls: "border-white/10 bg-white/5 text-white/75",
    label: "Info",
    icon: <Calendar className="w-4 h-4" />,
  };
}

export default function Notifications() {
  const { id: eventId } = useParams<Params>();
  const nav = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [ceremonyType, setCeremonyType] = useState<CeremonyType | null>(null);

  async function load() {
    if (!eventId) return;
    setLoading(true);
    try {
      const [list, interview] = await Promise.all([
        api.getTasks(eventId),
        api.getInterview(eventId),
      ]);

      setTasks(Array.isArray(list) ? list : []);
      setCeremonyType((interview?.ceremony_type as CeremonyType) ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const notifications = useMemo(
    () => buildNotifications(tasks, ceremonyType),
    [tasks, ceremonyType]
  );

  return (
    <PageLayout
      title="Powiadomienia"
      subtitle="Aktywne powiadominia"
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={load}
            leftIcon={
              <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            }
            disabled={!eventId || loading}
          >
            Odśwież
          </Button>

          <Button
            variant="ghost"
            onClick={() => eventId && nav(`/event/${eventId}/tasks`)}
            disabled={!eventId}
            leftIcon={<ArrowRight className="w-4 h-4" />}
          >
            Przejdź do zadań
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#d7b45a]" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold text-white">Twoje powiadomienia</div>
              <div className="text-sm text-white/60">
                {notifications.length
                  ? `Wykryto: ${notifications.length}`
                  : "Brak pilnych rzeczy — wygląda dobrze."}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Loader2 className="animate-spin" size={16} />
                Ładowanie…
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                Brak powiadomień na teraz. Gdy zadania będą mieć terminy (lub będą zaległe),
                zobaczysz je tutaj automatycznie.
              </div>
            )}

            {!loading &&
              notifications.map((n) => {
                const chip = levelChip(n.level);
                return (
                  <button
                    key={n.id}
                    onClick={() =>
                      eventId &&
                      nav(`/event/${eventId}/tasks?task=${encodeURIComponent(n.taskId)}`)
                    }
                    className="
                      w-full text-left rounded-2xl border border-white/10 bg-white/5
                      p-4 hover:bg-white/7 transition
                    "
                    title="Kliknij aby przejść do zadania"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/90">{n.title}</div>
                        <div className="mt-1 text-sm text-white/75 break-words">{n.message}</div>

                        <div className="mt-2 text-xs text-white/55">
                          Termin:{" "}
                          <span className="text-white/70">{formatPlDate(n.dateISO)}</span>{" "}
                          • <span className="text-white/70">{n.dateLabel}</span>
                        </div>
                      </div>

                      <div
                        className={
                          "shrink-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs " +
                          chip.cls
                        }
                      >
                        {chip.icon}
                        {chip.label}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
