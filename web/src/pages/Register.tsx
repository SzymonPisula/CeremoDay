// src/pages/Register.tsx
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const loginStore = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await axios.post("http://localhost:4000/register", {
        email,
        password,
        name,
      });
      const token = res.data.token;
      loginStore.login(token);
      setMessage("Rejestracja zakończona sukcesem 🎉");
      navigate("/dashboard");
    } catch (err: unknown) {
      console.error("Register error", err);
      if (axios.isAxiosError(err)) {
        setMessage(err.response?.data?.message || "Błąd rejestracji");
      } else {
        setMessage("Nieoczekiwany błąd");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleRegister}
        className="bg-white p-6 rounded-2xl shadow-md w-80"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Rejestracja</h2>

        <input
          type="text"
          placeholder="Imię"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />
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
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
        >
          Zarejestruj się
        </button>

        <p className="text-center mt-3">
          Masz już konto?{" "}
          <a href="/login" className="text-blue-500">
            Zaloguj się
          </a>
        </p>

        {message && <p className="mt-3 text-center">{message}</p>}
      </form>
    </div>
  );
}
