import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "../store/auth";
import type { User } from "../types/User";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { token, logout } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log("🔑 Token wysyłany do backendu:", token);
        setLoading(true);
        const res = await axios.get<User>("http://localhost:4000/me", {
          headers: { Authorization: "Bearer " + token },
        });
        console.log("📩 Odpowiedź z backendu:", res.data);
        setProfile(res.data);
        setNameInput(res.data.name);
      } catch (err) {
        console.error("❌ Błąd pobierania profilu:", err);
        logout();
        navigate("/login"); // ⬅️ wyrzucamy niezalogowanego
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchProfile();
    else navigate("/login"); // ⬅️ brak tokena → login
  }, [token, logout, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setMessage("Imię nie może być puste");
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      const res = await axios.put(
        "http://localhost:4000/me",
        { name: nameInput.trim() },
        { headers: { Authorization: "Bearer " + token } }
      );
      console.log("📩 Odpowiedź po zapisie:", res.data);
      if (res.data?.success) {
        setProfile(res.data.user);
        setMessage("✅ Zapisano zmiany");
      } else {
        setMessage("❌ Nie udało się zapisać");
      }
    } catch (err) {
      console.error("❌ Błąd zapisu profilu:", err);
      setMessage("❌ Błąd podczas zapisu");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login"); // ⬅️ po wylogowaniu → login
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Panel użytkownika</h1>

      {loading ? (
        <p>Ładowanie danych...</p>
      ) : profile ? (
        <>
          <p className="mb-2">
            👋 Witaj, <strong>{profile.name}</strong> ({profile.email})
          </p>

          <form onSubmit={handleSave} className="bg-white p-4 rounded shadow-sm">
            <label className="block text-sm font-medium mb-1">Imię</label>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-3"
            />
            <div className="flex gap-2 items-center">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? "Zapisuję..." : "Zapisz"}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Wyloguj
              </button>
            </div>
            {message && <p className="mt-3 text-sm">{message}</p>}
          </form>
        </>
      ) : (
        <p>Brak danych profilu.</p>
      )}
    </div>
  );
}
