// web/src/components/vendors/VendorEditModal.tsx
import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Save, MapPin, Users, Package, ReceiptText, Info } from "lucide-react";
import Select, { type SelectOption } from "../../ui/Select";
import type { Vendor, VendorType } from "../../types/vendor";

type VendorWithExtras = Vendor & {
  county?: string | null;
  max_participants?: number | null;
  equipment?: string | null;
  pricing?: string | null;
  rental_info?: string | null;
};

type Props = {
  open: boolean;
  vendor: VendorWithExtras | null;
  vendorTypeOptions: ReadonlyArray<SelectOption<VendorType>>;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    type: VendorType;
    phone?: string;
    email?: string;
    website?: string;
    google_maps_url?: string;
    notes?: string;
  }) => Promise<void>;
};

function toOpt(v: string): string | undefined {
  const t = v.trim();
  return t ? t : undefined;
}

function hasAnySnapshot(v: VendorWithExtras) {
  return !!(
    (v.county && v.county.trim()) ||
    v.max_participants != null ||
    (v.equipment && v.equipment.trim()) ||
    (v.pricing && v.pricing.trim()) ||
    (v.rental_info && v.rental_info.trim())
  );
}

function cx(...v: Array<string | undefined | false>) {
  return v.filter(Boolean).join(" ");
}

export default function VendorEditModal({ open, vendor, vendorTypeOptions, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "OTHER" as VendorType,
    phone: "",
    email: "",
    website: "",
    google_maps_url: "",
    notes: "",
  });

  useEffect(() => {
    if (!open || !vendor) return;
    setErr(null);
    setSaving(false);

    setForm({
      name: vendor.name ?? "",
      type: (vendor.type as VendorType) ?? "OTHER",
      phone: vendor.phone ?? "",
      email: vendor.email ?? "",
      website: vendor.website ?? "",
      google_maps_url: vendor.google_maps_url ?? "",
      notes: vendor.notes ?? "",
    });
  }, [open, vendor]);

  const title = useMemo(() => (vendor ? `Edytuj: ${vendor.name}` : "Edytuj usługodawcę"), [vendor]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300]">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={() => (saving ? null : onClose())}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-[860px] rounded-[26px] border border-white/10 bg-[#07140f]/90 backdrop-blur-xl
                     shadow-[0_30px_120px_rgba(0,0,0,0.65)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{title}</div>
              <div className="text-xs text-white/55 mt-0.5">Edycja podstawowych danych + notatek.</div>
            </div>

            <button
              type="button"
              className="h-9 w-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition
                         inline-flex items-center justify-center"
              onClick={() => (saving ? null : onClose())}
              aria-label="Zamknij"
              title="Zamknij"
            >
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>

          {/* body (scroll only inside modal) */}
          <div className="p-5 max-h-[78vh] overflow-auto">
            {err && (
              <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
                {err}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="mb-2 text-[11px] tracking-wider uppercase text-white/60">Nazwa *</div>
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/90
                             outline-none focus:ring-2 focus:ring-[#c8a04b]/45 focus:border-[#c8a04b]/35"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="np. Foto Studio XYZ"
                />
              </div>

              <div className="relative z-[5]">
                <Select<VendorType>
                  label="Typ *"
                  value={form.type}
                  onChange={(v) => setForm((s) => ({ ...s, type: v }))}
                  options={vendorTypeOptions}
                />
              </div>

              <div>
                <div className="mb-2 text-[11px] tracking-wider uppercase text-white/60">Telefon</div>
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/90
                             outline-none focus:ring-2 focus:ring-[#c8a04b]/45 focus:border-[#c8a04b]/35"
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="+48 600 000 000"
                />
              </div>

              <div>
                <div className="mb-2 text-[11px] tracking-wider uppercase text-white/60">Email</div>
                <input
                  type="email"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/90
                             outline-none focus:ring-2 focus:ring-[#c8a04b]/45 focus:border-[#c8a04b]/35"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="kontakt@firma.pl"
                />
              </div>

              <div>
                <div className="mb-2 text-[11px] tracking-wider uppercase text-white/60">WWW</div>
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/90
                             outline-none focus:ring-2 focus:ring-[#c8a04b]/45 focus:border-[#c8a04b]/35"
                  value={form.website}
                  onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
                  placeholder="https://twojastrona.pl"
                />
              </div>

              <div>
                <div className="mb-2 text-[11px] tracking-wider uppercase text-white/60">Link Google Maps</div>
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/90
                             outline-none focus:ring-2 focus:ring-[#c8a04b]/45 focus:border-[#c8a04b]/35"
                  value={form.google_maps_url}
                  onChange={(e) => setForm((s) => ({ ...s, google_maps_url: e.target.value }))}
                  placeholder="https://maps.google.com/?q=..."
                />
              </div>

              {/* notes */}
              <div className="md:col-span-2">
                <div className="mb-2 text-[11px] tracking-wider uppercase text-white/60">Notatki</div>
                <textarea
                  className="w-full min-h-[120px] rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/90
                             outline-none focus:ring-2 focus:ring-[#c8a04b]/45 focus:border-[#c8a04b]/35"
                  value={form.notes}
                  onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="np. ustalenia, ceny, terminy, kontakt do menedżera…"
                />
              </div>

              {/* snapshot (READ-ONLY) */}
              {vendor && hasAnySnapshot(vendor) ? (
                <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-xs text-white/60">Dane sali gminnej (podgląd)</div>
                    <span className="text-[11px] text-white/45">bez edycji</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vendor.county ? (
                      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <MapPin className="w-4 h-4 text-[#c8a04b] mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wider text-white/55">Powiat</div>
                          <div className="text-sm text-white/85">{vendor.county}</div>
                        </div>
                      </div>
                    ) : null}

                    {vendor.max_participants != null ? (
                      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <Users className="w-4 h-4 text-[#c8a04b] mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wider text-white/55">Max osób</div>
                          <div className="text-sm text-white/85">{vendor.max_participants}</div>
                        </div>
                      </div>
                    ) : null}

                    {vendor.equipment ? (
                      <div className="md:col-span-2 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <Package className="w-4 h-4 text-[#c8a04b] mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wider text-white/55">Wyposażenie</div>
                          <div className="text-sm text-white/80 whitespace-pre-wrap">{vendor.equipment}</div>
                        </div>
                      </div>
                    ) : null}

                    {vendor.pricing ? (
                      <div className="md:col-span-2 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <ReceiptText className="w-4 h-4 text-[#c8a04b] mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wider text-white/55">Cennik / warunki</div>
                          <div className="text-sm text-white/80 whitespace-pre-wrap">{vendor.pricing}</div>
                        </div>
                      </div>
                    ) : null}

                    {vendor.rental_info ? (
                      <div className="md:col-span-2 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <Info className="w-4 h-4 text-[#c8a04b] mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wider text-white/55">Informacje o wynajmie</div>
                          <div className="text-sm text-white/80 whitespace-pre-wrap">{vendor.rental_info}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {/* footer */}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                className="h-11 px-4 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition"
                onClick={() => (saving ? null : onClose())}
              >
                Anuluj
              </button>

              <button
                type="button"
                className={cx(
                  "h-11 px-4 rounded-xl bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14]",
                  "font-semibold shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] hover:brightness-105",
                  "transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                )}
                disabled={saving}
                onClick={async () => {
                  if (!vendor) return;

                  const name = form.name.trim();
                  if (name.length < 2) {
                    setErr("Nazwa jest wymagana (min. 2 znaki).");
                    return;
                  }

                  setErr(null);
                  setSaving(true);
                  try {
                    await onSave({
                      name,
                      type: form.type,
                      phone: toOpt(form.phone),
                      email: toOpt(form.email),
                      website: toOpt(form.website),
                      google_maps_url: toOpt(form.google_maps_url),
                      notes: toOpt(form.notes),
                    });
                    onClose();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Nie udało się zapisać zmian.");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Zapisz
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}