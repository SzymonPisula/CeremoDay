// CeremoDay/web/src/components/admin/AdminCreateUserModal.tsx
import { useEffect, useMemo, useState } from "react";
import { X, UserPlus } from "lucide-react";

import Select, { type SelectOption } from "../../ui/Select";
import Input from "../../ui/Input";

import type { AdminCreateUserPayload, UserRole } from "../../types/admin";

type Props = {
  open: boolean;
  saving?: boolean;
  error?: string | null;
  fieldErrors?: Record<string, string> | null;
  onClose: () => void;
  onCreate: (payload: AdminCreateUserPayload) => void;
};

const roleOptions: SelectOption<UserRole>[] = [
  { value: "user", label: "user" },
  { value: "admin", label: "admin" },
];

export default function AdminCreateUserModal({
  open,
  saving,
  error,
  fieldErrors,
  onClose,
  onCreate,
}: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Scroll-lock (żeby modal był zawsze w centrum i nie "uciekał" scroll'em)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset form po otwarciu
  useEffect(() => {
    if (!open) return;
    setEmail("");
    setName("");
    setPassword("");
    setRole("user");
    setTouched({});
  }, [open]);

  const localErrors = useMemo(() => {
    const e: Record<string, string> = {};
    const em = email.trim();
    if (!em) e.email = "Email jest wymagany.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) e.email = "Podaj poprawny email.";

    const pwd = password;
    if (!pwd.trim()) e.password = "Hasło jest wymagane.";
    else if (pwd.trim().length < 10) e.password = "Hasło min. 10 znaków.";

    const nm = name.trim();
    if (nm && nm.length < 2) e.name = "Nazwa min. 2 znaki.";

    return e;
  }, [email, name, password]);

  const canSubmit = Object.keys(localErrors).length === 0 && !saving;

  if (!open) return null;

  const cardBase =
    "rounded-2xl border border-white/10 bg-[#0b1f17]/95 shadow-2xl backdrop-blur-md";

  const labelCls = "text-xs font-semibold text-white/80";
  const hintCls = "mt-1 text-xs text-white/45";

  const fieldErr = (k: string) => {
    if (fieldErrors && fieldErrors[k]) return fieldErrors[k];
    if (touched[k] && localErrors[k]) return localErrors[k];
    return null;
  };

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={"w-full max-w-lg " + cardBase}>
          {/* header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-white flex items-center gap-2">
                <UserPlus size={18} className="text-[#d7b45a]" />
                Dodaj użytkownika
              </div>
              <div className="mt-1 text-sm text-white/55">
                Email + hasło są wymagane. Rola domyślnie: user.
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
              aria-label="Zamknij"
            >
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="p-4 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div>
              <Input
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                placeholder="nazwa@domena.pl"
              />
              {fieldErr("email") ? (
                <div className="mt-2 text-xs text-red-200">{fieldErr("email")}</div>
              ) : (
                <div className={hintCls}>Email musi być unikalny.</div>
              )}
            </div>

            <div>
              <Input
                label="Nazwa (opcjonalnie)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                placeholder="np. Szymon"
              />
              {fieldErr("name") && <div className="mt-2 text-xs text-red-200">{fieldErr("name")}</div>}
            </div>

            <div>
              <Input
                label="Hasło"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                placeholder="min. 10 znaków (litera + cyfra)"
              />
              {fieldErr("password") ? (
                <div className="mt-2 text-xs text-red-200">{fieldErr("password")}</div>
              ) : (
                <div className={hintCls}>Backend wymaga min. 10 znaków, litery i cyfry.</div>
              )}
            </div>

            <div>
              <div className={labelCls}>Rola</div>
              <Select
                label=""
                value={role}
                options={roleOptions}
                onChange={(v) => setRole(v as UserRole)}
              />
              <div className={hintCls}>Uwaga: rola admin daje dostęp do panelu admina.</div>
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-2 border-t border-white/10 p-4">
            <button
              type="button"
              onClick={onClose}
              className={
                "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 " +
                "px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition disabled:opacity-60"
              }
              disabled={!!saving}
            >
              Anuluj
            </button>

            <button
              type="button"
              disabled={!canSubmit}
              className={
                "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold " +
                "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
                "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
                "hover:brightness-105 active:translate-y-[1px] transition disabled:opacity-60"
              }
              onClick={() => {
                setTouched({ email: true, password: true, name: true });
                if (!canSubmit) return;
                onCreate({
                  email: email.trim(),
                  password: password.trim(),
                  name: name.trim() ? name.trim() : null,
                  role,
                });
              }}
            >
              {saving ? "Tworzenie…" : "Dodaj"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
