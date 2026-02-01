import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageLayout from "../layout/PageLayout";
import Tile from "../ui/Tile";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import { api } from "../lib/api";
import { useUiStore } from "../store/ui";

import type { EventUserRow, EventUsersResponse, EventRole, EventUserStatus } from "../types/eventUsers";
import { UserMinus, LogOut, Crown, Shield } from "lucide-react";

type Params = { id: string };

const roleLabel = (r: EventRole): string => {
  if (r === "owner") return "Właściciel";
  if (r === "coorganizer") return "Współorganizator";
  return "Współorganizator";
};

const roleIcon = (r: EventRole) => {
  if (r === "owner") return <Crown className="w-4 h-4 text-[rgba(246,226,122,0.95)]" />;
  if (r === "coorganizer") return <Shield className="w-4 h-4 text-[rgba(246,226,122,0.95)]" />;
  return <Shield className="w-4 h-4 text-[rgba(246,226,122,0.95)]" />;
};

export default function EventUsers() {
  const { id } = useParams<Params>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ✅ globalne toasty i potwierdzenia (jak w pozostałych modułach)
  const toast = useUiStore((s) => s.toast);
  const confirmAsync = useUiStore((s) => s.confirmAsync);
  const [data, setData] = useState<EventUsersResponse | null>(null);
  const [view, setView] = useState<"active" | "pending">("active");

  const eventId = id ?? "";

  const myRole = data?.my_role ?? null;
  const myStatus = (data?.my_status ?? "active") as EventUserStatus;
  const canManage = myRole === "owner";

  const { activeList, pendingList } = useMemo(() => {
    const rows = (data?.users ?? []) as EventUserRow[];
    const normalized = rows.map((r) => ({ ...r, status: r.status ?? "active" }));
    const sortFn = (a: EventUserRow, b: EventUserRow) => {
      const order = (r: EventRole) => (r === "owner" ? 0 : r === "coorganizer" ? 1 : 2);
      return order(a.role) - order(b.role);
    };
    return {
      activeList: normalized.filter((r) => r.status === "active").sort(sortFn),
      pendingList: normalized.filter((r) => r.status === "pending").sort(sortFn),
    };
  }, [data]);

  async function reload() {
    try {
      setErr(null);
      setLoading(true);
      const res = await api.getEventUsers(eventId);
      setData(res);
      if ((res?.my_status ?? "active") === "pending") {
        setView("pending");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać użytkowników");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!eventId) return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function onRemove(userId: string) {
    if (!eventId) return;

    const ok = await confirmAsync({
      tone: "danger",
      title: "Usunąć użytkownika z wydarzenia?",
      message: "Użytkownik straci dostęp do modułów w tym wydarzeniu.",
      confirmText: "Usuń",
      cancelText: "Anuluj",
    });
    if (!ok) return;

    try {
      await api.removeEventUser(eventId, userId);
      await reload();
      toast({ tone: "success", title: "Usunięto użytkownika" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się usunąć użytkownika";
      setErr(msg);
      toast({ tone: "danger", title: "Błąd", message: msg });
    }
  }

  async function onApprove(userId: string) {
    if (!eventId) return;
    try {
      await api.approveEventUser(eventId, userId);
      await reload();
      toast({ tone: "success", title: "Zaakceptowano użytkownika" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się zaakceptować użytkownika";
      setErr(msg);
      toast({ tone: "danger", title: "Błąd", message: msg });
    }
  }

  async function onReject(userId: string) {
    if (!eventId) return;

    const ok = await confirmAsync({
      tone: "warning",
      title: "Odrzucić zgłoszenie?",
      message: "Użytkownik nie zostanie dopuszczony do wydarzenia.",
      confirmText: "Odrzuć",
      cancelText: "Anuluj",
    });
    if (!ok) return;

    try {
      await api.rejectEventUser(eventId, userId);
      await reload();
      toast({ tone: "success", title: "Odrzucono zgłoszenie" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się odrzucić zgłoszenia";
      setErr(msg);
      toast({ tone: "danger", title: "Błąd", message: msg });
    }
  }


  async function onLeave() {
    if (!eventId) return;
    try {
      await api.leaveEvent(eventId);
      navigate("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się opuścić wydarzenia");
    }
  }

  return (
    <PageLayout
      title="Użytkownicy wydarzenia"
      subtitle="Zarządzaj uczestnikami i rolami w ramach wydarzenia"
      actions={
        myRole && myRole !== "owner" ? (
          <Button variant="ghost" onClick={onLeave} leftIcon={<LogOut className="w-4 h-4" />}>
            Opuść wydarzenie
          </Button>
        ) : null
      }
    >
      {myStatus === "pending" ? (
        <Tile>
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Twoje dołączenie do wydarzenia <span className="font-semibold">oczekuje na akceptację właściciela</span>.
            Do tego czasu możesz jedynie podejrzeć status i ewentualnie wycofać prośbę.
          </div>
        </Tile>
      ) : null}

      <Tile>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm text-white/70">Twoja rola</div>
            <div className="mt-1 inline-flex items-center gap-2">
              {myRole ? roleIcon(myRole) : null}
              <div className="text-lg font-semibold text-white">{myRole ? roleLabel(myRole) : "—"}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-white/70">Uprawnienia</div>
            <div className="mt-1 text-sm text-white">
              {canManage
                ? "Możesz akceptować/usuwać uczestników"
                : myStatus === "pending"
                  ? "Oczekujesz na akceptację"
                  : "Możesz opuścić wydarzenie"}
            </div>
          </div>
        </div>
      </Tile>

      <Tile>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-white">Lista uczestników</div>
            <div className="text-sm text-white/70">
              {canManage
                ? "Zarządzaj aktywnymi i oczekującymi zgłoszeniami"
                : "Właściciel może usuwać inne osoby"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? (
              <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => setView("active")}
                  className={
                    "px-3 py-1.5 text-sm rounded-2xl transition " +
                    (view === "active" ? "bg-white/[0.08] text-white" : "text-white/70 hover:text-white")
                  }
                >
                  Aktywni ({activeList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setView("pending")}
                  className={
                    "px-3 py-1.5 text-sm rounded-2xl transition " +
                    (view === "pending" ? "bg-white/[0.08] text-white" : "text-white/70 hover:text-white")
                  }
                >
                  Oczekujący ({pendingList.length})
                </button>
              </div>
            ) : null}
            <Button variant="secondary" onClick={reload} disabled={loading}>
              Odśwież
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {err ? (
            <div className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {err}
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-white/70">Ładowanie…</div>
          ) : (canManage ? (view === "active" ? activeList : pendingList) : activeList).length === 0 ? (
            <EmptyState
              title={canManage && view === "pending" ? "Brak oczekujących" : "Brak użytkowników"}
              description={
                canManage && view === "pending"
                  ? "Nie ma żadnych zgłoszeń do akceptacji."
                  : "Nie znaleziono uczestników w tym wydarzeniu."
              }
            />
          ) : (
            <div className="space-y-2">
              {(canManage ? (view === "active" ? activeList : pendingList) : activeList).map((row) => {
                const u = row.user;
                const name = u?.name?.trim() ? u.name : "(bez imienia)";
                const isMe = row.user_id === (data?.my_user_id ?? "");
                const canRemoveRow = canManage && row.role !== "owner";
                const isPending = (row.status ?? "active") === "pending";
                return (
                  <div
                    key={`${row.event_id}:${row.user_id}`}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {roleIcon(row.role)}
                        <div className="truncate text-sm font-semibold text-white">{name}</div>
                        <div className="text-xs text-white/60">
                          • {roleLabel(row.role)}
                          {isPending ? " • Oczekuje" : ""}
                        </div>
                      </div>
                      <div className="mt-1 truncate text-xs text-white/60">{u?.email ?? ""}</div>
                    </div>

                    <div className="flex items-center gap-2 md:justify-end">
                      {canManage && isPending ? (
                        <>
                          <Button variant="secondary" onClick={() => onApprove(row.user_id)}>
                            Akceptuj
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => onReject(row.user_id)}
                            leftIcon={<UserMinus className="w-4 h-4" />}
                          >
                            Odrzuć
                          </Button>
                        </>
                      ) : null}

                      {canRemoveRow && !isPending ? (
                        <Button
                          variant="ghost"
                          onClick={() => onRemove(row.user_id)}
                          leftIcon={<UserMinus className="w-4 h-4" />}
                        >
                          Usuń
                        </Button>
                      ) : null}
                      {isMe ? (
                        <div className="text-xs text-white/60">To Ty</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Tile>
    </PageLayout>
  );
}
