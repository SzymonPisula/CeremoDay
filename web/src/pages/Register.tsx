import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../lib/api";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.register(form);
      // Wymaganie: po rejestracji -> logowanie (bez auto-login)
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Nieznany błąd");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
<img
  src="/logo.png"
  alt="CeremoDay"
  className="mb-15 h-67 w-67 object-contain"
  draggable={false}
/>


          <div className="-mt-15 text-sm text-[rgba(245,246,248,0.68)]">Utwórz konto, a potem zaloguj się</div>
        </div>

        <Card className="w-full p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.12em] text-[rgba(245,246,248,0.62)]">IMIĘ</label>
              <Input
                value={form.name}
                placeholder="Twoje imię"
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.12em] text-[rgba(245,246,248,0.62)]">EMAIL</label>
              <Input
                type="email"
                value={form.email}
                autoComplete="email"
                placeholder="twoj@email.pl"
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.12em] text-[rgba(245,246,248,0.62)]">HASŁO</label>
              <Input
                type="password"
                value={form.password}
                autoComplete="new-password"
                placeholder="••••••••"
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              />
            </div>

            {error ? (
              <div className="rounded-[16px] border border-[rgba(255,120,120,0.26)] bg-[rgba(255,80,80,0.08)] px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}

            <Button type="submit" variant="primary" size="lg" isLoading={loading} className="w-full">
              Zarejestruj się
            </Button>

            <div className="pt-1 text-center text-sm text-[rgba(245,246,248,0.70)]">
              Masz już konto?{" "}
              <Link to="/login" className="text-[rgba(246,226,122,0.95)] hover:underline">
                Zaloguj się
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
