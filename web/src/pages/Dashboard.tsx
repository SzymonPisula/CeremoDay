import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import PageLayout from "../layout/PageLayout";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import StatCard from "../ui/StatCard";

type EventRole = "owner" | "coorganizer" | "guest";

interface Event {
  id: string;
  name: string;
  access_code: string;
  created_by_me: boolean;
  role: EventRole;
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
  event?: Event;
}

interface ApiErrorShape {
  status?: number;
  message?: string;
}

function RoleBadge({ role }: { role: EventRole }) {
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
    guest: {
      label: "Gość",
      className:
        "border-[rgba(18,120,84,0.40)] bg-[rgba(18,120,84,0.14)] text-[rgba(208,255,236,0.86)]",
    },
  };

  const cfg = map[role];
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
  useEffect(() => {
    if (!token) return;

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await api.getEvents()) as Event[];
        setEvents(data);
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

    fetchEvents();
  }, [token, logout, navigate]);

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

      const created =
        typeof response === "object" && response !== null && "event" in response && response.event
          ? ((response as CreateEventResponse).event as Event)
          : (response as Event);

      setEvents((prev) => [...prev, created]);

      setNewEventName("");
      setNewEventDate("");
      setNewEventLocation("");
      setSuccessMessage("Wydarzenie zostało utworzone.");
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

      const joined =
        typeof response === "object" && response !== null && "event" in response && response.event
          ? ((response as JoinEventResponse).event as Event)
          : (response as Event);

      setEvents((prev) => {
        if (prev.some((ev) => ev.id === joined.id)) return prev;
        return [...prev, joined];
      });

      setJoinCode("");
      setSuccessMessage("Dołączono do wydarzenia.");
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
          {loading ? (
            <div className="text-sm text-[rgba(245,246,248,0.60)]">Ładuję…</div>
          ) : null}
        </div>

        {events.length === 0 ? (
          <Card className="p-7">
            <div className="text-sm text-[rgba(245,246,248,0.70)]">
              Nie masz jeszcze żadnych wydarzeń. Utwórz nowe albo dołącz kodem.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((ev) => (
              <Card
                key={ev.id}
                className="p-6 sm:p-7 cursor-pointer transition-[transform,filter] duration-200 hover:brightness-105 hover:-translate-y-[1px] flex flex-col min-h-[178px]"
                onClick={() => navigate(`/event/${ev.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-medium tracking-wide text-[rgba(245,246,248,0.60)]">
                      Wydarzenie
                    </div>

                    {/* ✅ 2 linie zamiast ucinania */}
                    <div
                      className="mt-2 text-xl font-semibold tracking-tight text-[rgba(245,246,248,0.96)] line-clamp-2"
                      title={ev.name}
                    >
                      {ev.name}
                    </div>

                    <div className="mt-3 text-sm text-[rgba(245,246,248,0.66)]">
                      Kod dostępu:{" "}
                      <span className="text-[rgba(246,226,122,0.92)]">{ev.access_code}</span>
                    </div>
                  </div>

                  <RoleBadge role={ev.role} />
                </div>

                {/* ✅ stopka zawsze na dole */}
                <div className="mt-auto pt-6 flex items-center justify-between">
                  <div className="text-xs text-[rgba(245,246,248,0.55)]">Kliknij, aby otworzyć panel</div>
                  <div className="text-sm font-medium text-[rgba(246,226,122,0.92)]">Otwórz →</div>
                </div>
              </Card>
            ))}
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
