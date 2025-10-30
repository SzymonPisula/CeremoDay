import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";

interface Event {
  id: number;
  name: string;
  access_code: string;
  created_by_me: boolean; // nowa flaga do odróżnienia własnych wydarzeń
}

export default function Dashboard() {
  const { token, logout } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const loadEvents = async () => {
      try {
        setLoading(true);
        const data = await api.getEvents();
        setEvents(data);
      } catch (err) {
        console.error("Błąd ładowania wydarzeń:", err);
        logout();
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [token, logout, navigate]);

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) return alert("Podaj nazwę wydarzenia");
    try {
      const data = await api.createEvent({ name: newEventName });
      navigate(`/event/${data.event.id}`);
    } catch (err) {
      console.error(err);
      alert("Nie udało się utworzyć wydarzenia");
    }
  };


const handleJoinEvent = async () => {
  if (!joinCode.trim()) return alert("Podaj kod wydarzenia");
  try {
    const data = await api.joinEvent({ access_code: joinCode.trim() });
    // dodajemy do listy events z flagą created_by_me: false
    setEvents(prev => [...prev, { ...data.event, created_by_me: false }]);
    setJoinCode("");
  } catch (err: unknown) {
    if (err instanceof Error) alert(err.message);
    else alert("Nie udało się dołączyć do wydarzenia");
    console.error(err);
  }
};


  const handleLogout = () => {
    logout();
    navigate("/login");
  };


const myEvents = events.filter((e) => e.created_by_me);
const joinedEvents = events.filter((e) => !e.created_by_me);


  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Twoje wydarzenia</h1>

      {loading ? (
        <p>Ładowanie...</p>
      ) : (
        <>
          {/* Sekcja Moje wydarzenia */}
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Moje wydarzenia</h2>
            {myEvents.length === 0 ? (
              <p className="mb-4">Nie masz jeszcze żadnych wydarzeń.</p>
            ) : (
              <ul className="mb-4 space-y-2">
                {myEvents.map((event) => (
                  <li
                    key={event.id}
                    className="p-3 bg-white rounded shadow hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    <strong>{event.name}</strong> — kod: {event.access_code}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Sekcja Dołączone wydarzenia */}
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Dołączone wydarzenia</h2>
            {joinedEvents.length === 0 ? (
              <p className="mb-4">Nie dołączyłeś jeszcze do żadnego wydarzenia.</p>
            ) : (
              <ul className="mb-4 space-y-2">
                {joinedEvents.map((event) => (
                  <li
                    key={event.id}
                    className="p-3 bg-gray-100 rounded shadow hover:bg-gray-200 cursor-pointer"
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    <strong>{event.name}</strong> — kod: {event.access_code}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Formularz do tworzenia nowego wydarzenia */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Nazwa nowego wydarzenia"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="border rounded p-2 flex-1"
            />
            <button
              onClick={handleCreateEvent}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              ➕ Utwórz
            </button>
          </div>

          {/* Formularz do dołączania do wydarzenia */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Kod wydarzenia"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="border rounded p-2 flex-1"
            />
            <button
              onClick={handleJoinEvent}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              🔗 Dołącz
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Wyloguj
          </button>
        </>
      )}
    </div>
  );
}
