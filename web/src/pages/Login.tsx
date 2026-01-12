import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";

/** ✅ jawny typ odpowiedzi z API */
type LoginResponse = {
  token: string;
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const { login } = useAuthStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const redirectTo = useMemo(() => {
    const from = location.state?.from;
    if (from && typeof from === "string" && from.startsWith("/")) return from;
    return "/dashboard";
  }, [location.state]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = (await api.login({
        email: form.email,
        password: form.password,
      })) as LoginResponse;

      // ✅ poprawnie typowany token
      login(res.token);
      localStorage.setItem("token", res.token);

      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Nieznany błąd");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <img
  src="/logo.png"
  alt="CeremoDay"
  className="mb-15 h-67 w-67 object-contain"
  draggable={false}
/>


          <div className="-mt-15 text-sm text-[rgba(245,246,248,0.68)]">
            Zaloguj się, aby zarządzać swoim wydarzeniem
          </div>
        </div>

        <Card className="w-full p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.12em] text-[rgba(245,246,248,0.78)]">
                EMAIL
              </label>
              <Input
                type="email"
                value={form.email}
                autoComplete="email"
                placeholder="twoj@email.pl"
                onChange={(e) =>
                  setForm((s) => ({ ...s, email: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.12em] text-[rgba(245,246,248,0.78)]">
                HASŁO
              </label>
              <Input
                type="password"
                value={form.password}
                autoComplete="current-password"
                placeholder="••••••••"
                onChange={(e) =>
                  setForm((s) => ({ ...s, password: e.target.value }))
                }
                required
              />
            </div>

            {error ? (
              <div className="rounded-[16px] border border-[rgba(255,120,120,0.26)] bg-[rgba(255,80,80,0.08)] px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full"
            >
              Zaloguj się
            </Button>

            <div className="pt-1 text-center text-sm text-[rgba(245,246,248,0.70)]">
              Nie masz konta?{" "}
              <Link
                to="/register"
                className="text-[rgba(246,226,122,0.95)] hover:underline"
              >
                Zarejestruj się
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
