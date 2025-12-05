import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";

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
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // pobieranie wydarzeń
  useEffect(() => {
    if (!token) return;

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        // getEvents zwraca Promise<unknown>, więc rzutujemy na Event[]
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

  const myEvents = events.filter((e) => e.created_by_me);
  const joinedEvents = events.filter((e) => !e.created_by_me);

  const handleCreateEvent = async (e: React.FormEvent) => {
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

      let created: Event;
      if (typeof response === "object" && response !== null && "event" in response && response.event) {
        created = (response as CreateEventResponse).event as Event;
      } else {
        created = response as Event;
      }

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

  const handleJoinEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setError(null);
    setSuccessMessage(null);

    try {
      const body: JoinEventBody = {
        access_code: joinCode.trim(),
      };

      const response = (await api.joinEvent(body)) as JoinEventResponse | Event;

      let joined: Event;
      if (typeof response === "object" && response !== null && "event" in response && response.event) {
        joined = (response as JoinEventResponse).event as Event;
      } else {
        joined = response as Event;
      }

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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderRoleBadge = (role: EventRole) => {
    switch (role) {
      case "owner":
        return (
          <span className="ml-2 text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
            Narzeczeni (właściciel)
          </span>
        );
      case "coorganizer":
        return (
          <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
            Współorganizator
          </span>
        );
      case "guest":
        return (
          <span className="ml-2 text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
            Gość
          </span>
        );
      default:
        return null;
    }
  };

  if (!token) {
    // chwilowy guard – useEffect już robi redirect
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">CeremoDay – Twoje wydarzenia</h1>
            <p className="text-sm text-slate-500">
              Zarządzaj ślubami, do których należysz, twórz nowe wydarzenia i dołączaj do istniejących.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="self-start md:self-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
          >
            Wyloguj
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-700 px-4 py-2 text-sm">
            {successMessage}
          </div>
        )}

        {/* Sekcja tworzenia nowego wydarzenia */}
        <section className="mb-8 border border-slate-200 rounded-xl p-4 md:p-5">
          <h2 className="text-lg font-semibold mb-3">Nowe wydarzenie</h2>
          <form onSubmit={handleCreateEvent} className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nazwa wydarzenia *
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="Np. Ślub Ania &amp; Tomek"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Data (opcjonalnie)
              </label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Lokalizacja (opcjonalnie)
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
                placeholder="Np. Warszawa"
              />
            </div>
            <div className="md:col-span-3 flex justify-end mt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60"
                disabled={loading || !newEventName.trim()}
              >
                Utwórz wydarzenie
              </button>
            </div>
          </form>
        </section>

        {/* Sekcja dołączania do wydarzenia */}
        <section className="mb-8 border border-slate-200 rounded-xl p-4 md:p-5">
          <h2 className="text-lg font-semibold mb-3">Dołącz do wydarzenia</h2>
          <form onSubmit={handleJoinEvent} className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Kod wydarzenia
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Wpisz kod zaproszenia"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-60"
              disabled={loading || !joinCode.trim()}
            >
              Dołącz
            </button>
          </form>
        </section>

        {/* Lista wydarzeń */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Twoje wydarzenia</h2>

          {loading && <p className="text-sm text-slate-500 mb-2">Ładowanie wydarzeń…</p>}

          {!loading && events.length === 0 && (
            <p className="text-sm text-slate-500">
              Nie masz jeszcze żadnych wydarzeń. Utwórz nowe albo dołącz do istniejącego.
            </p>
          )}

          {/* Moje wydarzenia */}
          {myEvents.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Utworzone przeze mnie</h3>
              <ul className="space-y-2">
                {myEvents.map((event) => (
                  <li
                    key={event.id}
                    className="p-3 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer flex items-center justify-between"
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    <div>
                      <div className="font-medium flex items-center">
                        {event.name}
                        {renderRoleBadge(event.role)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Kod: <span className="font-mono">{event.access_code}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dołączone wydarzenia */}
          {joinedEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Dołączone wydarzenia</h3>
              <ul className="space-y-2">
                {joinedEvents.map((event) => (
                  <li
                    key={event.id}
                    className="p-3 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer flex items-center justify-between"
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    <div>
                      <div className="font-medium flex items-center">
                        {event.name}
                        {renderRoleBadge(event.role)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Kod: <span className="font-mono">{event.access_code}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
