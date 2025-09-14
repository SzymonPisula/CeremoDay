import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "../store/auth";
import type { User } from "../types/User";
import { useNavigate, Link } from "react-router-dom";

export default function Dashboard() {
  const { token, logout } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

    useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await axios.get<User>("http://localhost:4000/me", {
          headers: { Authorization: "Bearer " + token },
        });
        setProfile(res.data);
      } catch {
        logout();
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchProfile();
    else navigate("/login");
  }, [token, logout, navigate]);


  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Panel użytkownika</h1>

      {loading ? (
        <p>Ładowanie danych...</p>
      ) : profile ? (
        <>
          <p className="mb-6">
            👋 Witaj, <strong>{profile.name}</strong> ({profile.email})
          </p>

          {/* Nawigacja do modułów */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Link
              to="/guests"
              className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center"
            >
              👥 Lista gości
            </Link>
            <Link
              to="/schedule"
              className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center"
            >
              📅 Harmonogram
            </Link>
            <Link
              to="/documents"
              className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center"
            >
              📑 Dokumenty
            </Link>
            <Link
              to="/vendors"
              className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center"
            >
              🏪 Usługodawcy
            </Link>
            <Link
              to="/finance"
              className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center"
            >
              💰 Finanse
            </Link>
            <Link
              to="/notifications"
              className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center"
            >
              🔔 Powiadomienia
            </Link>
            <Link
              to="/reports"
              className="p-4 bg-white shadow rounded hover:bg-gray-100 text-center"
            >
              📊 Raporty
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Wyloguj
          </button>
        </>
      ) : (
        <p>Brak danych profilu.</p>
      )}
    </div>
  );
}
