// CeremoDay/web/src/pages/Dashboard.tsx
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import PageLayout from "../layout/PageLayout";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import StatCard from "../ui/StatCard";

type EventRole = "owner" | "coorganizer";
type EventStatus = "pending" | "active" | "removed";

interface Event {
  id: string;
  name: string;
  access_code: string;
  created_by_me: boolean;
  role: EventRole;
  status?: EventStatus;
}

interface CreateEventBody {
  name: string;
  start_date: string | null;
  location: string | null;
}

interface CreateEventResponse {
  success?: boolean;
  event?: Event;
}

interface JoinEventBody {
  access_code: string;
}

interface JoinEventResponse {
  success?: boolean;
  event?: Partial<Event> | Event;
  status?: EventStatus | string;
}

function StatusBadge({ status }: { status: EventStatus }) {
  if (status !== "pending") return null;
  return (
    <span className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs font-medium tracking-wide text-[rgba(245,246,248,0.86)]">
      Oczekuje na akceptację
    </span>
  );
}

interface ApiErrorShape {
  status?: number;
  message?: string;
}

/**
 * ✅ Bezpieczny badge roli:
 * - jeśli backend zwróci event bez role (po join), UI nie może się wywalić.
 */
function RoleBadge({ role }: { role: EventRole | undefined | null }) {
  const map: Record<EventRole, { label: string; className: string }> = {
    owner: {
      label: "Właściciel",
      className:
        "border-[rgba(212,175,55,0.45)] bg-[rgba(212,175,55,0.12)] text-[rgba(246,226,122,0.95)]",
    },
    coorganizer: {
      label: "Współorganizator",
      className:
        "border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] text-[rgba(245,246,248,0.86)]",
    },
  };

  const cfg = role ? map[role] : null;

  if (!cfg) {
    return (
      <span className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs font-medium tracking-wide text-[rgba(245,246,248,0.86)]">
        Uczestnik
      </span>
    );
  }

  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide " +
        cfg.className
      }
    >
      {cfg.label}
    </span>
  );
}

/**
 * ✅ Status bywa: "pending" / "PENDING" / "active" / "ACTIVE" itd.
 */
function normalizeStatus(input: unknown): EventStatus | undefined {
  if (typeof input !== "string") return undefined;
  const s = input.trim().toLowerCase();
  if (s === "pending") return "pending";
  if (s === "active") return "active";
  if (s === "removed") return "removed";
  return undefined;
}

/**
 * ✅ Normalizacja eventu (lista z API też bywa niepełna)
 */
function normalizeEvent(input: unknown): Event {
  const ev = (input ?? {}) as Partial<Event>;

  return {
    id: String(ev.id ?? ""),
    name: String(ev.name ?? "Wydarzenie"),
    access_code: String(ev.access_code ?? ""),
    created_by_me: Boolean(ev.created_by_me ?? false),
    role: (ev.role as EventRole) ?? "coorganizer",
    status: normalizeStatus(ev.status),
  };
}

/**
 * ✅ Normalizacja eventu po join:
 * - backend czasem zwraca event bez role/status
 * - tu gwarantujemy stabilny shape do UI
 */
function normalizeJoinedEvent(input: Partial<Event> | Event, statusFromApi?: unknown): Event {
  const base = normalizeEvent(input);
  const status = normalizeStatus(statusFromApi) ?? base.status;

  return {
    ...base,
    role: base.role ?? "coorganizer",
    status,
  };
}

/**
 * ✅ getEvents() bywa: Event[] albo {events: Event[]} albo {data: Event[]}
 */
function unwrapEventsResponse(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.events)) return obj.events;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
  }

  return [];
}

export default function Dashboard() {
  const { token, logout } = useAuthStore();
  const navigate = useNavigate();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // jeśli nie ma tokena – na login
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // pobieranie wydarzeń
  const refreshEvents = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const raw = await api.getEvents();
      const list = unwrapEventsResponse(raw).map(normalizeEvent).filter((e) => !!e.id);

      setEvents(list);
    } catch (err: unknown) {
      console.error(err);
      const apiError = err as ApiErrorShape;
      setError(apiError.message ?? "Nie udało się pobrać wydarzeń");

      if (apiError.status === 401 || apiError.message === "Unauthorized") {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void refreshEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const myEvents = useMemo(() => events.filter((e) => e.created_by_me), [events]);
  const joinedEvents = useMemo(() => events.filter((e) => !e.created_by_me), [events]);

  const handleCreateEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    setError(null);
    setSuccessMessage(null);

    try {
      const body: CreateEventBody = {
        name: newEventName.trim(),
        start_date: newEventDate || null,
        location: newEventLocation || null,
      };

      const response = (await api.createEvent(body)) as CreateEventResponse | Event;

      const createdRaw =
        typeof response === "object" && response !== null && "event" in response && response.event
          ? (response as CreateEventResponse).event
          : (response as Event);

      const created = normalizeEvent(createdRaw);

      setEvents((prev) => {
        if (prev.some((ev) => ev.id === created.id)) return prev;
        return [...prev, created];
      });

      setNewEventName("");
      setNewEventDate("");
      setNewEventLocation("");
      setSuccessMessage("Wydarzenie zostało utworzone.");

      navigate(`/event/${created.id}`, { replace: true });
    } catch (err: unknown) {
      console.error(err);
      const apiError = err as ApiErrorShape;
      setError(apiError.message ?? "Nie udało się utworzyć wydarzenia");
    }
  };

  const handleJoinEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setError(null);
    setSuccessMessage(null);

    try {
      const body: JoinEventBody = { access_code: joinCode.trim() };

      const response = (await api.joinEvent(body)) as JoinEventResponse | Event;

      const wrapped = typeof response === "object" && response !== null && "event" in response;
      const statusFromApi = wrapped ? (response as JoinEventResponse).status : undefined;

      const rawEvent =
        wrapped && (response as JoinEventResponse).event
          ? (response as JoinEventResponse).event
          : (response as Event);

      const joined = normalizeJoinedEvent(rawEvent as Partial<Event> | Event, statusFromApi);

      setEvents((prev) => {
        if (prev.some((ev) => ev.id === joined.id)) return prev;
        return [...prev, joined];
      });

      // dociągnij spójne dane (role/statusy z listy)
      await refreshEvents();

      setJoinCode("");

      // ✅ Nie wchodzimy, jeśli pending albo status nieznany (bezpiecznie)
      if (joined.status !== "active") {
        setSuccessMessage(
          "Wysłano prośbę o dołączenie. Czekasz na akceptację właściciela (lub odśwież listę wydarzeń)."
        );
        return;
      }

      setSuccessMessage("Dołączono do wydarzenia.");
      navigate(`/event/${joined.id}`, { replace: true });
    } catch (err: unknown) {
      console.error(err);
      const apiError = err as ApiErrorShape;
      setError(apiError.message ?? "Nie udało się dołączyć do wydarzenia");
    }
  };

  if (!token) return null;

  return (
    <PageLayout
      title="Moje wydarzenia"
      subtitle="Twoje wydarzenia i szybki start. Wybierz event, utwórz nowy lub dołącz kodem."
    >
      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Wydarzenia" value={events.length} hint="Łącznie" />
        <StatCard title="Twoje" value={myEvents.length} hint="Utworzone przez Ciebie" />
        <StatCard title="Dołączone" value={joinedEvents.length} hint="Zaproszenia / współorganizacja" />
      </div>

      {/* Alerts */}
      {error ? (
        <Card className="p-5 border border-[rgba(255,80,80,0.25)] bg-[rgba(255,80,80,0.08)]">
          <div className="text-sm text-[rgba(255,220,220,0.95)]">{error}</div>
        </Card>
      ) : null}
      {successMessage ? (
        <Card className="p-5 border border-[rgba(18,120,84,0.35)] bg-[rgba(18,120,84,0.10)]">
          <div className="text-sm text-[rgba(208,255,236,0.92)]">{successMessage}</div>
        </Card>
      ) : null}

      {/* Events list */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-[rgba(245,246,248,0.94)]">
            Twoje wydarzenia
          </h2>
          {loading ? <div className="text-sm text-[rgba(245,246,248,0.60)]">Ładuję…</div> : null}
        </div>

        {events.length === 0 ? (
          <Card className="p-7">
            <div className="text-sm text-[rgba(245,246,248,0.70)]">
              Nie masz jeszcze żadnych wydarzeń. Utwórz nowe albo dołącz kodem.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((ev) => {
              const isPending = ev.status === "pending" && !ev.created_by_me;

              return (
                <Card
                  key={ev.id}
                  className={
                    "p-6 sm:p-7 transition-[transform,filter] duration-200 flex flex-col min-h-[178px] " +
                    (isPending
                      ? "cursor-not-allowed opacity-90"
                      : "cursor-pointer hover:brightness-105 hover:-translate-y-[1px]")
                  }
                  onClick={() => {
                    if (isPending) return;
                    navigate(`/event/${ev.id}`);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-medium tracking-wide text-[rgba(245,246,248,0.60)]">
                        Wydarzenie
                      </div>

                      <div
                        className="mt-2 text-xl font-semibold tracking-tight text-[rgba(245,246,248,0.96)] line-clamp-2"
                        title={ev.name}
                      >
                        {ev.name}
                      </div>

                      {ev.role === "owner" ? (
                        <div className="mt-3 text-sm text-[rgba(245,246,248,0.66)]">
                          Kod dostępu:{" "}
                          <span className="text-[rgba(246,226,122,0.92)]">{ev.access_code}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <RoleBadge role={ev.role} />
                      {ev.status ? <StatusBadge status={ev.status} /> : null}
                    </div>
                  </div>

                  <div className="mt-auto pt-6 flex items-center justify-between">
                    <div className="text-xs text-[rgba(245,246,248,0.55)]">
                      {isPending ? "Oczekuje na akceptację właściciela" : "Kliknij, aby otworzyć panel"}
                    </div>
                    <div className="text-sm font-medium text-[rgba(246,226,122,0.92)]">
                      {isPending ? "—" : "Otwórz →"}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create + Join */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-6 sm:p-7">
          <div className="text-sm font-semibold text-[rgba(245,246,248,0.92)]">Utwórz nowe wydarzenie</div>
          <p className="mt-2 text-sm text-[rgba(245,246,248,0.66)]">
            Podaj nazwę i lokalizację. Później dopracujesz szczegóły w panelu.
          </p>

          <form onSubmit={handleCreateEvent} className="mt-6 space-y-4">
            <Input
              label="Nazwa"
              placeholder="np. Ślub Ani i Bartka"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              required
            />

            <Input
              label="Lokalizacja (Miejscowość)"
              placeholder="np. Kraków"
              value={newEventLocation}
              onChange={(e) => setNewEventLocation(e.target.value)}
            />

            <div className="pt-2">
              <Button variant="primary" type="submit">
                Utwórz wydarzenie
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6 sm:p-7">
          <div className="text-sm font-semibold text-[rgba(245,246,248,0.92)]">Dołącz do wydarzenia</div>
          <p className="mt-2 text-sm text-[rgba(245,246,248,0.66)]">
            Wpisz kod dostępu od narzeczonych / współorganizatora.
          </p>

          <form onSubmit={handleJoinEvent} className="mt-6 space-y-4">
            <Input
              label="Kod dostępu"
              placeholder="np. ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button variant="secondary" type="submit">
                Dołącz
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PageLayout>
  );
}
