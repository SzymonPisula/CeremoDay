import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

export default function EventDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!id) return;

    let alive = true;

    (async () => {
      try {
        const interview = await api.getInterview(id);
        if (!alive) return;

        // jeśli brak wywiadu -> pierwszy raz -> odpal wywiad
        if (!interview) {
          navigate(`/event/${id}/interview`, { replace: true });
          return;
        }
      } catch {
        // jeśli API padnie – nie blokuj dashboardu
      } finally {
        if (alive) setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, navigate]);

  if (!id) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-xl font-bold">Brak ID wydarzenia</h1>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="p-4 bg-white shadow rounded">Ładowanie wydarzenia…</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Wydarzenie #{id}</h1>
          <p className="text-gray-600">Wybierz moduł:</p>
        </div>

        <Link
          to={`/event/${id}/interview/edit`}
          className="px-3 py-2 rounded bg-white shadow hover:bg-gray-50"
        >
          ✏️ Edytuj wywiad
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        <Link to={`/event/${id}/guests`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">👥 Goście</Link>
        <Link to={`/event/${id}/tasks`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">📅 Harmonogram</Link>
        <Link to={`/event/${id}/documents`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">📑 Dokumenty</Link>
        <Link to={`/event/${id}/vendors`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">🏪 Usługodawcy</Link>
        <Link to={`/event/${id}/finance`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">💰 Finanse</Link>
        <Link to={`/event/${id}/notifications`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">🔔 Powiadomienia</Link>
        <Link to={`/event/${id}/reports`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">📊 Raporty</Link>
        <Link to={`/event/${id}/inspirations`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">✨ Inspiracje</Link>
      </div>
    </div>
  );
}
