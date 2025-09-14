import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom"; // 👈 dodajemy Link
import { useAuthStore } from "../store/auth";

export default function Login() {
  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("test123");
  const [message, setMessage] = useState<string | null>(null);
  const loginStore = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await axios.post("http://localhost:4000/login", { email, password });
      const token = res.data.token;
      loginStore.login(token);
      setMessage("Zalogowano");
      navigate("/dashboard"); // 👈 automatyczny redirect
    } catch (err: unknown) {
      console.error("Login error", err);
      if (axios.isAxiosError(err)) {
        setMessage(err.response?.data?.message || "Błąd logowania");
      } else {
        setMessage("Nieoczekiwany błąd");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded-2xl shadow-md w-80">
        <h2 className="text-xl font-bold mb-4 text-center">Logowanie</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Zaloguj
        </button>
        <p className="text-center mt-3">
          Nie masz konta?{" "}
          <Link to="/register" className="text-blue-500">
            Zarejestruj się
          </Link>
        </p>
        {message && <p className="mt-3 text-center">{message}</p>}
      </form>
    </div>
  );
}
