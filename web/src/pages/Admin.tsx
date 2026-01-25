// CeremoDay/web/src/pages/Admin.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../store/auth";
import { api, ApiError } from "../lib/api";
import AdminCreateUserModal from "../components/admin/AdminCreateUserModal";
import Select from "../ui/Select";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Tile from "../ui/Tile";

import type { AdminCreateUserPayload, AdminUser, UserRole } from "../types/admin";

export default function Admin() {
  const me = useAuthStore((s) => s.me);
  const isAdmin = me?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState<Record<string, string>>({});

  // create user modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string> | null>(null);

  const roleOptions = useMemo(
    () => [
      { value: "user", label: "user" },
      { value: "admin", label: "admin" },
    ],
    []
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      const email = u.email.toLowerCase();
      const role = u.role.toLowerCase();
      return name.includes(s) || email.includes(s) || role.includes(s);
    });
  }, [q, users]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const list = await api.adminListUsers();
      setUsers(list);
    } catch {
      setErr("Błąd pobierania użytkowników.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin]);

  async function saveUser(u: AdminUser) {
    setSavingId(u.id);
    setErr(null);

    try {
      const pwd = (passwordDraft[u.id] ?? "").trim();

      // jeśli user coś wpisał w hasło → walidujemy
      if (pwd && pwd.length < 8) {
        setErr("Hasło musi mieć minimum 8 znaków.");
        return;
      }

      const payload: {
        email: string;
        name: string | null;
        role: UserRole;
        password?: string;
      } = {
        email: u.email,
        name: u.name,
        role: u.role,
        ...(pwd ? { password: pwd } : {}),
      };

      const updated = await api.adminUpdateUser(u.id, payload);

      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

      // czyścimy pole hasła po sukcesie
      if (pwd) {
        setPasswordDraft((prev) => ({ ...prev, [u.id]: "" }));
      }
    } catch {
      setErr("Błąd zapisu użytkownika.");
    } finally {
      setSavingId(null);
    }
  }

  async function createUser(payload: AdminCreateUserPayload) {
    setCreateSaving(true);
    setCreateError(null);
    setCreateFieldErrors(null);

    try {
      const created = await api.adminCreateUser(payload);
      // dodaj na początek (order w backendzie DESC, więc UXowo spójnie)
      setUsers((prev) => [created, ...prev]);
      setCreateOpen(false);
    } catch (e) {
      if (e instanceof ApiError) {
        setCreateError(e.message || "Nie udało się utworzyć użytkownika.");
        if (e.fields) setCreateFieldErrors(e.fields);
      } else {
        setCreateError("Nie udało się utworzyć użytkownika.");
      }
    } finally {
      setCreateSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <Tile>
          <div className="text-lg font-semibold text-white">Admin</div>
          <div className="mt-2 text-sm text-white/70">
            Brak uprawnień. Panel widoczny tylko dla admina.
          </div>
        </Tile>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tile>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">Panel admina</div>
            <div className="mt-1 text-sm text-white/70">
              Użytkownicy: edycja nazwa/email/rola + opcjonalnie hasło (przez „Zapisz”)
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setCreateError(null);
                setCreateFieldErrors(null);
                setCreateOpen(true);
              }}
              disabled={loading}
            >
              Dodaj użytkownika
            </Button>
            <Button onClick={load} disabled={loading}>
              Odśwież
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-end gap-3">
          <Input
            label="Szukaj"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="email / nazwa / rola"
          />
          <div className="pb-2 text-sm text-white/60">
            {loading ? "Ładowanie..." : `Wyniki: ${filtered.length}/${users.length}`}
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-3 text-left">Nazwa</th>
                <th className="py-3 pr-3 text-left">Email</th>
                <th className="py-3 pr-3 text-left">Hasło</th>
                <th className="py-3 pr-3 text-left">Rola</th>
                <th className="py-3 text-right">Akcje</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-white/60">
                    Ładowanie...
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/10 align-top">
                    <td className="py-3 pr-3">
                      <input
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                        value={u.name ?? ""}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((x) => (x.id === u.id ? { ...x, name: e.target.value || null } : x))
                          )
                        }
                      />
                    </td>

                    <td className="py-3 pr-3">
                      <input
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                        value={u.email}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((x) => (x.id === u.id ? { ...x, email: e.target.value } : x))
                          )
                        }
                      />
                    </td>

                    <td className="py-3 pr-3">
                      <input
                        type="password"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                        value={passwordDraft[u.id] ?? ""}
                        onChange={(e) => setPasswordDraft((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        placeholder="(opcjonalnie) nowe hasło min. 8"
                      />
                    </td>

                    <td className="py-3 pr-3">
                      <Select
                        label=""
                        value={u.role}
                        options={roleOptions}
                        onChange={(v) =>
                          setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: v as UserRole } : x)))
                        }
                      />
                    </td>

                    <td className="py-3 text-right">
                      <Button onClick={() => saveUser(u)} disabled={savingId === u.id}>
                        {savingId === u.id ? "Zapis..." : "Zapisz"}
                      </Button>
                    </td>
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-white/60">
                    Brak wyników
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Tile>

      <AdminCreateUserModal
        open={createOpen}
        saving={createSaving}
        error={createError}
        fieldErrors={createFieldErrors}
        onClose={() => setCreateOpen(false)}
        onCreate={createUser}
      />
    </div>
  );
}
