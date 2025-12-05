import { Link, useParams } from "react-router-dom";

export default function EventDashboard() {
  const { id } = useParams();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Wydarzenie #{id}</h1>
      <p className="mb-6 text-gray-600">Wybierz moduł:</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link to={`/event/${id}/guests`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">👥 Goście</Link>
        <Link to={`/event/${id}/tasks`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">📅 Harmonogram</Link>
        <Link to={`/event/${id}/documents`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">📑 Dokumenty</Link>
        <Link to={`/event/${id}/vendors`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">🏪 Usługodawcy</Link>
        <Link to={`/event/${id}/finance`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">💰 Finanse</Link>
        <Link to={`/event/${id}/notifications`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">🔔 Powiadomienia</Link>
        <Link to={`/event/${id}/reports`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">📊 Raporty</Link>
        <Link to={`/event/${id}/inspirations`} className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center">📊 Inspiracje</Link>
      </div>
    </div>
  );
}
