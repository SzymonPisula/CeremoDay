import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.register(form);
      localStorage.setItem("token", res.token);
      navigate("/dashboard");
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
        <h2 className="text-2xl font-bold mb-4 text-center">Rejestracja</h2>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <input name="name" placeholder="Imię" value={form.name} onChange={handleChange} className="w-full mb-2 p-2 border rounded" />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} className="w-full mb-2 p-2 border rounded" />
        <input name="password" type="password" placeholder="Hasło" value={form.password} onChange={handleChange} className="w-full mb-4 p-2 border rounded" />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Zarejestruj się
        </button>
      </form>
    </div>
  );
}
