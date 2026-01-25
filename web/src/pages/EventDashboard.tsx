// CeremoDay/web/src/pages/EventDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import {
  Users,
  FileText,
  Wallet,
  BarChart3,
  CheckSquare,
  MapPin,
  CalendarHeart,
  Sparkles,
  Pencil,
  ArrowRight,
  UserCog,
  LogOut,
  Bell,
  AlertTriangle,
  Clock,
  Calendar,
  Loader2,
} from "lucide-react";

import { api } from "../lib/api";
import { useUiStore } from "../store/ui";

import PageLayout from "../layout/PageLayout";
import Tile from "../ui/Tile";
import Button from "../ui/Button";
import Card from "../ui/Card";
import type { AppLayoutOutletContext } from "../layout/AppLayout";
import type { Task } from "../types/task";

type Params = { id?: string };

type NotifLevel = "danger" | "warn" | "info";

type UiNotification = {
  id: string;
  level: NotifLevel;
  title: string;
  message: string;
  dateISO: string; // YYYY-MM-DD
  dateLabel: string; // "Dziś", "Jutro", "Za 3 dni", "3 dni temu"
  taskId: string;
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
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function formatPlDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });
}

function buildNotificationsFromTasks(tasks: Task[]): UiNotification[] {
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

    const due = startOfDay(new Date(t.due_date));
    if (Number.isNaN(due.getTime())) continue;

    const dueISO = toISODate(due);
    const diff = daysDiff(today, due);

    if (due < today) {
      notifs.push({
        id: `overdue:${t.id}`,
        level: "danger",
        title: "Zaległe zadanie",
        message: t.title,
        dateISO: dueISO,
        dateLabel: diff === -1 ? "Wczoraj" : `${Math.abs(diff)} dni temu`,
        taskId: t.id,
      });
      continue;
    }

    if (dueISO === todayISO) {
      notifs.push({
        id: `today:${t.id}`,
        level: "warn",
        title: "Termin dzisiaj",
        message: t.title,
        dateISO: dueISO,
        dateLabel: "Dziś",
        taskId: t.id,
      });
      continue;
    }

    if (dueISO === tomorrowISO) {
      notifs.push({
        id: `tomorrow:${t.id}`,
        level: "warn",
        title: "Termin jutro",
        message: t.title,
        dateISO: dueISO,
        dateLabel: "Jutro",
        taskId: t.id,
      });
      continue;
    }

    if (due <= weekEnd) {
      notifs.push({
        id: `soon:${t.id}`,
        level: "info",
        title: "Zbliża się termin",
        message: t.title,
        dateISO: dueISO,
        dateLabel: `Za ${diff} dni`,
        taskId: t.id,
      });
    }
  }

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

export default function EventDashboard() {
  const { id: eventId } = useParams<Params>();
  const nav = useNavigate();
  const confirmAsync = useUiStore((s) => s.confirmAsync);
  const toast = useUiStore((s) => s.toast);

  const ctx = useOutletContext<AppLayoutOutletContext | undefined>();
  const eventName = ctx?.eventName ?? null;
  const weddingDayEnabled = ctx?.weddingDayEnabled ?? false;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingRight, setLoadingRight] = useState(false);

  async function loadRightPanels() {
    if (!eventId) return;
    setLoadingRight(true);
    try {
      const list = await api.getTasks(eventId);
      setTasks(Array.isArray(list) ? list : []);
    } catch (e) {
      // panel boczny ma być “miękki” — nie wywalaj całej strony
      console.error("❌ EventDashboard: nie udało się pobrać tasks", e);
      setTasks([]);
    } finally {
      setLoadingRight(false);
    }
  }

  useEffect(() => {
    loadRightPanels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleLeaveEvent() {
    if (!eventId) return;

    const ok = await confirmAsync({
  title: "Opuścić wydarzenie?",
  message:
    "Stracisz dostęp do modułów tego wydarzenia. Jeśli będziesz chciał wrócić — owner musi dodać Cię ponownie.",
  confirmText: "Opuść",
  cancelText: "Anuluj",
  tone: "danger",
});

    if (!ok) return;

    try {
      await api.leaveEvent(eventId);
      nav("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Nie udało się opuścić wydarzenia.";
      toast({ tone: "danger", title: "Błąd", message: msg });
    }
  }

  const modules = useMemo(() => {
    const base = `/event/${eventId}`;

    const list = [
      {
        key: "users",
        title: "Użytkownicy",
        subtitle: "Role i dostęp do wydarzenia.",
        icon: <UserCog className="w-5 h-5" />,
        to: `${base}/users`,
      },
      {
        key: "guests",
        title: "Goście",
        subtitle: "Lista, RSVP, podgoście, alergeny.",
        icon: <Users className="w-5 h-5" />,
        to: `${base}/guests`,
      },
      {
        key: "documents",
        title: "Dokumenty",
        subtitle: "Checklisty, pliki, statusy.",
        icon: <FileText className="w-5 h-5" />,
        to: `${base}/documents`,
      },
      {
        key: "finance",
        title: "Finanse",
        subtitle: "Budżet, koszty, płatności.",
        icon: <Wallet className="w-5 h-5" />,
        to: `${base}/finance`,
      },
      {
        key: "reports",
        title: "Raporty",
        subtitle: "Podsumowania i statystyki.",
        icon: <BarChart3 className="w-5 h-5" />,
        to: `${base}/reports`,
      },
      {
        key: "tasks",
        title: "Zadania",
        subtitle: "Aktywne i ukończone zadania.",
        icon: <CheckSquare className="w-5 h-5" />,
        to: `${base}/tasks`,
      },
      {
        key: "vendors",
        title: "Usługodawcy",
        subtitle: "Firmy + sale gminne.",
        icon: <MapPin className="w-5 h-5" />,
        to: `${base}/vendors`,
      },
      ...(weddingDayEnabled
        ? [
            {
              key: "wedding-day",
              title: "Dzień ślubu",
              subtitle: "Twój wymarzony dzień w jednym miejscu.",
              icon: <CalendarHeart className="w-5 h-5" />,
              to: `${base}/wedding-day`,
            },
          ]
        : []),
      {
        key: "inspirations",
        title: "Inspiracje",
        subtitle: "Tablice i moodboard.",
        icon: <Sparkles className="w-5 h-5" />,
        to: `${base}/inspirations`,
      },
    ] as const;

    return list;
  }, [eventId, weddingDayEnabled]);

  const canNavigate = Boolean(eventId);
  const safeEventId = eventId ?? "";
  const pageTitle = eventName?.trim() ? eventName : `Wydarzenie #${safeEventId}`;

  // ✅ PRAWA KOLUMNA: Powiadomienia (z tasks)
  const notifications = useMemo(() => buildNotificationsFromTasks(tasks), [tasks]);

  // ✅ PRAWA KOLUMNA: Zadania na najbliższy tydzień
  const nextWeekTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const weekEnd = startOfDay(new Date(today));
    weekEnd.setDate(weekEnd.getDate() + 7);

    return (tasks ?? [])
      .filter((t) => t && t.status !== "done" && t.due_date)
      .filter((t) => {
        const due = startOfDay(new Date(t.due_date as string));
        if (Number.isNaN(due.getTime())) return false;
        return due >= today && due <= weekEnd;
      })
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
      .slice(0, 7);
  }, [tasks]);

  return (
    <PageLayout
      title={pageTitle}
      subtitle="Twoje miejsce na szybki dostęp do wybranych modułów."
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveEvent}
            className="
              inline-flex items-center gap-2 rounded-xl
              border border-red-400/20 bg-red-500/10
              px-4 py-2 text-sm text-red-100/90
              hover:bg-red-500/15 hover:border-red-300/25
              transition
            "
          >
            <LogOut size={16} />
            Opuść wydarzenie
          </button>

          <Button
            variant="secondary"
            onClick={() => canNavigate && nav(`/event/${eventId}/interview/edit`)}
            disabled={!canNavigate}
            leftIcon={<Pencil className="w-4 h-4" />}
          >
            Edytuj wywiad
          </Button>

          <Button variant="ghost" onClick={() => nav("/dashboard")}>
            Powrót do twoich wydarzeń
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-6">
        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/70">Moduły</div>
              <div className="text-lg font-semibold text-white">Wybierz obszar</div>
            </div>
            <div className="text-xs text-white/60">Kliknij kafelek aby otworzyć</div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {modules.map((m) => (
              <Tile
                key={m.key}
                title={m.title}
                subtitle={m.subtitle}
                icon={m.icon}
                onClick={() => canNavigate && nav(m.to)}
                className={!canNavigate ? "opacity-60" : undefined}
              >
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--cd-gold)]">
                  Otwórz <ArrowRight className="w-4 h-4" />
                </div>
              </Tile>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          {/* ✅ POWIADOMIENIA (zamiast Szybkich akcji) */}
          <Card className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-white/70">Powiadomienia</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  Najważniejsze rzeczy
                </div>
                <div className="mt-1 text-sm text-white/60">
                  Na bazie terminów zadań (in-app).
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadRightPanels}
                  className="
                    inline-flex items-center gap-2 rounded-xl border border-white/10
                    bg-white/5 px-3 py-2 text-xs text-white/75 hover:bg-white/10 transition
                  "
                  disabled={!eventId || loadingRight}
                  title="Odśwież"
                >
                  {loadingRight ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  Odśwież
                </button>

                <Button
                  variant="secondary"
                  onClick={() => canNavigate && nav(`/event/${eventId}/notifications`)}
                  disabled={!canNavigate}
                >
                  Zobacz wszystkie
                </Button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {loadingRight && (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Loader2 className="animate-spin" size={16} />
                  Ładowanie…
                </div>
              )}

              {!loadingRight && notifications.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  Brak pilnych rzeczy — wygląda dobrze.
                </div>
              )}

              {!loadingRight &&
                notifications.slice(0, 4).map((n) => {
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
                          <div className="mt-1 text-sm text-white/75 break-words">
                            {n.message}
                          </div>

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

              {!loadingRight && notifications.length > 4 && (
                <div className="text-xs text-white/55">
                  +{notifications.length - 4} więcej w module „Powiadomienia”.
                </div>
              )}
            </div>
          </Card>

          {/* ✅ ZADANIA NA NAJBLIŻSZY TYDZIEŃ (zamiast Podpowiedzi) */}
          <Card className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-white/70">Zadania</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  Na najbliższy tydzień
                </div>
                <div className="mt-1 text-sm text-white/60">
                  Najbliższe terminy — kliknij aby przejść do szczegółów.
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={() => canNavigate && nav(`/event/${eventId}/tasks`)}
                disabled={!canNavigate}
              >
                Otwórz zadania
              </Button>
            </div>

            <div className="mt-5 space-y-2">
              {loadingRight && (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Loader2 className="animate-spin" size={16} />
                  Ładowanie…
                </div>
              )}

              {!loadingRight && nextWeekTasks.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  Brak zadań z terminem w ciągu 7 dni.
                </div>
              )}

              {!loadingRight &&
                nextWeekTasks.map((t) => {
                  const iso = String(t.due_date ?? "");
                  return (
                    <button
                      key={t.id}
                      onClick={() =>
                        eventId &&
                        nav(`/event/${eventId}/tasks?task=${encodeURIComponent(t.id)}`)
                      }
                      className="
                        w-full text-left rounded-2xl border border-white/10 bg-white/5
                        p-4 hover:bg-white/7 transition
                      "
                      title="Kliknij aby przejść do zadania"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white/90 break-words">
                            {t.title}
                          </div>
                          <div className="mt-1 text-xs text-white/55">
                            Termin:{" "}
                            <span className="text-white/70">
                              {iso ? formatPlDate(iso) : "—"}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 inline-flex items-center gap-2 text-xs text-[var(--cd-gold)]">
                          Otwórz <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
