import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth"; // <-- dodaj import

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore(); // <-- pobieramy akcję login
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.login(form);

      login(res.token); // <-- zapisujemy token w zustand
      navigate("/dashboard"); // przekierowanie po zalogowaniu
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nieznany błąd");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-80">
        <h2 className="text-2xl font-bold mb-4 text-center">Logowanie</h2>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          name="password"
          type="password"
          placeholder="Hasło"
          value={form.password}
          onChange={handleChange}
          className="w-full mb-4 p-2 border rounded"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Zaloguj się
        </button>
      </form>
    </div>
  );
}
