// CeremoDay/web/src/pages/Profile.tsx
import { useEffect, useMemo, useState } from "react";

import PageLayout from "../layout/PageLayout";
import Tile from "../ui/Tile";
import Field from "../ui/Field";
import Input from "../ui/Input";
import Button from "../ui/Button";

import { api } from "../lib/api";
import type { MeResponse, UpdateMePayload } from "../types/user";
import { UserCircle2, AtSign, User2, LockKeyhole } from "lucide-react";

type ProfileErrors = Partial<{
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  newPassword2: string;
}>;

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [me, setMe] = useState<MeResponse | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [errors, setErrors] = useState<ProfileErrors>({});

  const createdAtFormatted = useMemo(() => {
    const created = me?.created_at;
    if (!created) return "—";
    return new Date(created).toLocaleString("pl-PL");
  }, [me]);

  const wantsPasswordChange = useMemo(() => {
    return !!(currentPassword || newPassword || newPassword2);
  }, [currentPassword, newPassword, newPassword2]);

  function validate(): ProfileErrors {
    const e: ProfileErrors = {};

    if (!name.trim()) e.name = "Imię jest wymagane.";
    if (!email.trim()) e.email = "Email jest wymagany.";

    if (wantsPasswordChange) {
      if (!currentPassword) e.currentPassword = "Podaj aktualne hasło.";
      if (!newPassword) e.newPassword = "Podaj nowe hasło.";
      if (newPassword && newPassword.length < 6) e.newPassword = "Nowe hasło musi mieć minimum 6 znaków.";
      if (!newPassword2) e.newPassword2 = "Powtórz nowe hasło.";
      if (newPassword && newPassword2 && newPassword !== newPassword2) e.newPassword2 = "Hasła nie są takie same.";
    }

    return e;
  }

  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const res = await api.getMe();
      setMe(res);
      setName(res.name ?? "");
      setEmail(res.email ?? "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać profilu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setOk(null);
    setErr(null);

    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    try {
      setSaving(true);

      const payload: UpdateMePayload = {
        name: name.trim(),
        email: email.trim(),
      };

      if (wantsPasswordChange) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await api.updateMe(payload);
      setMe(res.user);
      setOk("Zapisano zmiany");

      setCurrentPassword("");
      setNewPassword("");
      setNewPassword2("");
      setErrors({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się zapisać zmian");
    } finally {
      setSaving(false);
    }
  }

  const canSave = useMemo(() => {
    if (loading || saving) return false;
    const e = validate();
    return Object.keys(e).length === 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, saving, name, email, currentPassword, newPassword, newPassword2]);

  return (
    <PageLayout title="" subtitle="" actions={null}>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
          <UserCircle2 className="h-5 w-5 text-[#d7b45a]" />
        </div>

        <div>
          <h2 className="text-3xl font-semibold text-white leading-tight">Mój profil</h2>
          <div className="text-sm text-white/55 mt-1">Zmień swoje dane konta</div>
        </div>
      </div>

      <Tile>
        {err ? (
          <div className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
            {ok}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-white/70">Ładowanie…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Imię">
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((p) => ({ ...p, name: undefined }));
                    setOk(null);
                  }}
                  placeholder="Np. Szymon"
                  leftIcon={<User2 className="w-4 h-4" />}
                />
                {errors.name ? <div className="mt-1 text-xs text-red-200">{errors.name}</div> : null}
              </Field>

              <Field label="Email">
                <Input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((p) => ({ ...p, email: undefined }));
                    setOk(null);
                  }}
                  placeholder="np. mail@domena.pl"
                  leftIcon={<AtSign className="w-4 h-4" />}
                />
                {errors.email ? <div className="mt-1 text-xs text-red-200">{errors.email}</div> : null}
              </Field>

              <div className="md:col-span-2">
                <div className="mb-2 text-sm font-semibold text-white">Zmiana hasła (opcjonalnie)</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Aktualne hasło">
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setErrors((p) => ({ ...p, currentPassword: undefined }));
                        setOk(null);
                      }}
                      placeholder="••••••••"
                      leftIcon={<LockKeyhole className="w-4 h-4" />}
                    />
                    {errors.currentPassword ? (
                      <div className="mt-1 text-xs text-red-200">{errors.currentPassword}</div>
                    ) : null}
                  </Field>

                  <Field label="Nowe hasło">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrors((p) => ({ ...p, newPassword: undefined }));
                        setOk(null);
                      }}
                      placeholder="min. 6 znaków"
                      leftIcon={<LockKeyhole className="w-4 h-4" />}
                    />
                    {errors.newPassword ? <div className="mt-1 text-xs text-red-200">{errors.newPassword}</div> : null}
                  </Field>

                  <Field label="Powtórz nowe hasło">
                    <Input
                      type="password"
                      value={newPassword2}
                      onChange={(e) => {
                        setNewPassword2(e.target.value);
                        setErrors((p) => ({ ...p, newPassword2: undefined }));
                        setOk(null);
                      }}
                      placeholder="powtórz"
                      leftIcon={<LockKeyhole className="w-4 h-4" />}
                    />
                    {errors.newPassword2 ? (
                      <div className="mt-1 text-xs text-red-200">{errors.newPassword2}</div>
                    ) : null}
                  </Field>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-white/55">
              Utworzono: <span className="text-white/70">{createdAtFormatted}</span>
            </div>

            <div className="mt-6 flex items-center justify-end">
              <Button
                onClick={save}
                disabled={!canSave}
                className="border border-[rgba(246,226,122,0.45)] bg-gradient-to-r from-[rgba(246,226,122,0.18)] to-[rgba(246,226,122,0.08)] text-[rgba(246,226,122,0.95)] hover:from-[rgba(246,226,122,0.22)] hover:to-[rgba(246,226,122,0.12)] disabled:opacity-60"
              >
                {saving ? "Zapisywanie…" : "Zapisz"}
              </Button>
            </div>
          </>
        )}
      </Tile>
    </PageLayout>
  );
}
