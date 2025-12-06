// CeremoDay/web/src/pages/Vendors.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Building2,
  ExternalLink,
  Loader2,
  MapPin,
  Users,
  Link2,
  Trash2,
  PlusCircle,
  Search,
} from "lucide-react";
import { api } from "../lib/api";
import type { Vendor, VendorType } from "../types/vendor";
import RuralVenuesMap from "../components/vendors/RuralVenuesMap";

type Params = {
  id: string; // eventId
};

const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  HALL: "Sala / obiekt",
  CATERING: "Catering",
  DJ: "DJ",
  BAND: "Zespół",
  PHOTO: "Fotograf",
  VIDEO: "Kamerzysta",
  DECOR: "Dekoracje / florysta",
  TRANSPORT: "Transport",
  OTHER: "Inne",
};

type GoogleServiceType =
  | "HALL"
  | "CATERING"
  | "DJ"
  | "BAND"
  | "PHOTO"
  | "VIDEO"
  | "DECOR"
  | "TRANSPORT"
  | "OTHER";

/**
 * Buduje URL do Google Maps Search na podstawie typu usługi i lokalizacji.
 */
function buildGoogleMapsSearchUrl(
  serviceType: GoogleServiceType,
  location: string
): string {
  const base = "https://www.google.com/maps/search/?api=1";

  const typeQueryMap: Record<GoogleServiceType, string> = {
    HALL: "sala weselna",
    CATERING: "catering weselny",
    DJ: "dj na wesele",
    BAND: "zespół weselny",
    PHOTO: "fotograf ślubny",
    VIDEO: "kamerzysta ślubny",
    DECOR: "dekoracje ślubne",
    TRANSPORT: "transport na wesele",
    OTHER: "usługi ślubne",
  };

  const baseQuery = typeQueryMap[serviceType];
  const fullQuery = location
    ? `${baseQuery} ${location}`.trim()
    : baseQuery;

  const params = new URLSearchParams({
    query: fullQuery,
  });

  return `${base}&${params.toString()}`;
}

export default function Vendors() {
  const { id: eventId } = useParams<Params>();

  const [ruralVendors, setRuralVendors] = useState<Vendor[]>([]);
  const [customVendors, setCustomVendors] = useState<Vendor[]>([]);
  const [loadingRural, setLoadingRural] = useState(false);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filtry dla sal gminnych
  const [county, setCounty] = useState("");
  const [minCapacity, setMinCapacity] = useState<string>("");
  const [maxCapacity, setMaxCapacity] = useState<string>("");
  const [searchRural, setSearchRural] = useState("");

  // Google Maps helper
  const [gmServiceType, setGmServiceType] =
    useState<GoogleServiceType>("HALL");
  const [gmLocation, setGmLocation] = useState("");

  // Formularz dodania własnego vendor
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorType, setNewVendorType] =
    useState<VendorType>("HALL");
  const [newVendorGmUrl, setNewVendorGmUrl] = useState("");
  const [newVendorNotes, setNewVendorNotes] = useState("");
  const [savingVendor, setSavingVendor] = useState(false);

  // początkowe ładowanie
  useEffect(() => {
    if (!eventId) return;
    void fetchCustomVendors(eventId);
    void fetchRural();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchRural = async () => {
    try {
      setLoadingRural(true);
      setError(null);

      const minCap = minCapacity ? Number(minCapacity) : undefined;
      const maxCap = maxCapacity ? Number(maxCapacity) : undefined;

      const data = await api.getRuralVenues({
  county: county || undefined,
  minCapacity: minCap,
  maxCapacity: maxCap,
  q: searchRural || undefined,
});

// oznaczamy źródło + uzupełniamy location
const mapped: Vendor[] = data.map((v) => ({
  ...v,
  source: "RURAL" as const,
  location:
    v.lat != null && v.lng != null
      ? {
          lat: Number(v.lat),
          lng: Number(v.lng),
        }
      : null,
}));

setRuralVendors(mapped);


      setRuralVendors(mapped);
    } catch (err) {
      console.error("❌ Błąd pobierania sal gminnych:", err);
      setError("Nie udało się pobrać sal gminnych");
    } finally {
      setLoadingRural(false);
    }
  };

  const fetchCustomVendors = async (evId: string) => {
    try {
      setLoadingCustom(true);
      setError(null);
      const data = await api.getEventVendors(evId);

      const mapped = data.map((v) => ({
        ...v,
        source: "CUSTOM" as const,
        event_id: evId,
      }));

      setCustomVendors(mapped);
    } catch (err) {
      console.error("❌ Błąd pobierania usługodawców wydarzenia:", err);
      setError("Nie udało się pobrać usługodawców wydarzenia");
    } finally {
      setLoadingCustom(false);
    }
  };

  const handleOpenGoogleMapsSearch = () => {
    const url = buildGoogleMapsSearchUrl(gmServiceType, gmLocation);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCreateVendor = async () => {
    if (!eventId) return;
    if (!newVendorName.trim()) {
      alert("Podaj nazwę usługodawcy");
      return;
    }

    try {
      setSavingVendor(true);
      setError(null);

      const created = await api.createVendor({
        event_id: eventId,
        name: newVendorName.trim(),
        type: newVendorType,
        google_maps_url: newVendorGmUrl.trim() || undefined,
        notes: newVendorNotes.trim() || undefined,
      });

      const mapped: Vendor = {
        ...(created as Vendor),
        source: "CUSTOM",
        location:
          created.lat != null && created.lng != null
            ? {
                lat: Number(created.lat),
                lng: Number(created.lng),
              }
            : null,
      };

      setCustomVendors((prev) => [...prev, mapped]);

      setNewVendorName("");
      setNewVendorGmUrl("");
      setNewVendorNotes("");
    } catch (err) {
      console.error("❌ Błąd tworzenia usługodawcy:", err);
      setError("Nie udało się dodać usługodawcy");
    } finally {
      setSavingVendor(false);
    }
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    if (!window.confirm("Na pewno chcesz usunąć tego usługodawcę?")) return;
    try {
      await api.deleteVendor(vendor.id);
      setCustomVendors((prev) =>
        prev.filter((v) => v.id !== vendor.id)
      );
    } catch (err) {
      console.error("❌ Błąd usuwania usługodawcy:", err);
      setError("Nie udało się usunąć usługodawcy");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 flex justify-center">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-md p-6 md:p-8">
        {/* Nagłówek */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-emerald-600" />
            <div>
              <h1 className="text-xl font-bold">
                Usługodawcy i sale
              </h1>
              <p className="text-sm text-slate-500">
                Połącz własną bazę usługodawców z wyszukiwaniem w
                Google Maps i bazą sal gminnych.
              </p>
              {eventId && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Wydarzenie: {eventId}
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Sekcja: Google Maps helper */}
        <section className="mb-6 text-xs border border-slate-200 rounded-xl p-4 bg-slate-50/60">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold">
              Znajdź usługodawcę w Google Maps
            </h2>
          </div>
          <p className="text-[11px] text-slate-600 mb-3">
            Ustaw rodzaj usługi i lokalizację, a następnie otwórz
            wyszukiwanie w Google Maps. Tam możesz znaleźć konkretną
            firmę, skopiować link i wpisać go poniżej jako
            „zapisany” usługodawca w CeremoDay.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 text-[11px] text-slate-600">
                Rodzaj usługi
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 px-2 py-1"
                value={gmServiceType}
                onChange={(e) =>
                  setGmServiceType(
                    e.target.value as GoogleServiceType
                  )
                }
              >
                <option value="HALL">Sala / obiekt</option>
                <option value="CATERING">Catering</option>
                <option value="DJ">DJ</option>
                <option value="BAND">Zespół</option>
                <option value="PHOTO">Fotograf</option>
                <option value="VIDEO">Kamerzysta</option>
                <option value="DECOR">Dekoracje / florysta</option>
                <option value="TRANSPORT">Transport</option>
                <option value="OTHER">Inne usługi ślubne</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-[11px] text-slate-600">
                Lokalizacja (miasto / region)
              </label>
              <input
                type="text"
                placeholder="np. Rzeszów, Kraków, powiat..."
                value={gmLocation}
                onChange={(e) => setGmLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleOpenGoogleMapsSearch}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-2 text-xs hover:bg-emerald-700"
              >
                <ExternalLink className="w-3 h-3" />
                Otwórz wyszukiwanie w Google Maps
              </button>
            </div>
          </div>
        </section>

        {/* Sekcja: Twoi zapisani usługodawcy */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">
              Twoi zapisani usługodawcy ({customVendors.length})
            </h2>
          </div>

          {/* Formularz szybkiego dodania */}
          <div className="mb-4 border border-slate-200 rounded-xl p-3 text-xs bg-slate-50/70">
            <div className="flex items-center gap-2 mb-2">
              <PlusCircle className="w-3 h-3 text-emerald-600" />
              <span className="font-semibold text-slate-700">
                Dodaj usługodawcę (np. z linkiem do Google Maps)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
              <div>
                <label className="block mb-1 text-[11px] text-slate-600">
                  Nazwa*
                </label>
                <input
                  type="text"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  placeholder="np. Sala Aura, DJ Nowak..."
                  className="w-full rounded-lg border border-slate-200 px-2 py-1"
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-slate-600">
                  Typ
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-2 py-1"
                  value={newVendorType}
                  onChange={(e) =>
                    setNewVendorType(e.target.value as VendorType)
                  }
                >
                  {(Object.keys(
                    VENDOR_TYPE_LABELS
                  ) as VendorType[]).map((t) => (
                    <option key={t} value={t}>
                      {VENDOR_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block mb-1 text-[11px] text-slate-600">
                  Link do Google Maps (opcjonalnie)
                </label>
                <div className="flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-slate-400" />
                  <input
                    type="url"
                    value={newVendorGmUrl}
                    onChange={(e) =>
                      setNewVendorGmUrl(e.target.value)
                    }
                    placeholder="Wklej link udostępniony z Google Maps"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1"
                  />
                </div>
              </div>
            </div>
            <div className="mb-2">
              <label className="block mb-1 text-[11px] text-slate-600">
                Notatki / ustalenia (opcjonalnie)
              </label>
              <textarea
                value={newVendorNotes}
                onChange={(e) =>
                  setNewVendorNotes(e.target.value)
                }
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                placeholder="Np. wstępna wycena, ważne terminy, co jeszcze trzeba ustalić..."
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCreateVendor}
                disabled={savingVendor || !eventId}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingVendor && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                Zapisz usługodawcę
              </button>
            </div>
          </div>

          {/* Lista zapisanych usługodawców */}
          {loadingCustom && (
            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Wczytywanie usługodawców...
            </p>
          )}
          {!loadingCustom && customVendors.length === 0 && (
            <p className="text-xs text-slate-500">
              Nie masz jeszcze żadnych zapisanych usługodawców. Dodaj
              ich powyżej – możesz też wkleić link z Google Maps.
            </p>
          )}

          <div className="space-y-3">
            {customVendors.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-xs flex flex-col md:flex-row md:items-start md:justify-between gap-2"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800">
                      {v.name}
                    </span>
                    {v.type && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {VENDOR_TYPE_LABELS[v.type as VendorType] ??
                          v.type}
                      </span>
                    )}
                  </div>
                  {v.address && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-600 mb-1">
                      <MapPin className="w-3 h-3" />
                      <span>{v.address}</span>
                    </div>
                  )}
                  {v.notes && (
                    <p className="text-[11px] text-slate-600 mb-1">
                      {v.notes}
                    </p>
                  )}
                  {v.google_maps_url && (
                    <a
                      href={v.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items_center gap-1 text-[11px] text-emerald-700 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Otwórz w Google Maps
                    </a>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 md:text-right flex flex-col items-end gap-1">
                  <span>Źródło: zapisane w CeremoDay</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteVendor(v)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                    Usuń
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

                {/* Sekcja: Sale gminne / wiejskie */}
        <section>
          <h2 className="text-sm font-semibold mb-2">
            Sale gminne / wiejskie z bazy ({ruralVendors.length})
          </h2>

          {/* Filtry */}
          <div className="mb-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block mb-1 text-[11px] text-slate-600">
                  Powiat
                </label>
                <input
                  type="text"
                  placeholder="np. mielecki"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1"
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-slate-600">
                  Min. liczba uczestników
                </label>
                <input
                  type="number"
                  min={0}
                  value={minCapacity}
                  onChange={(e) =>
                    setMinCapacity(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1"
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-slate-600">
                  Maks. liczba uczestników
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxCapacity}
                  onChange={(e) =>
                    setMaxCapacity(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1"
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-slate-600">
                  Szukaj (nazwa, adres, gmina)
                </label>
                <input
                  type="text"
                  placeholder="np. Dom Kultury, świetlica..."
                  value={searchRural}
                  onChange={(e) =>
                    setSearchRural(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCounty("");
                  setMinCapacity("");
                  setMaxCapacity("");
                  setSearchRural("");
                }}
                className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50"
              >
                Wyczyść filtry
              </button>
              <button
                type="button"
                onClick={fetchRural}
                disabled={loadingRural}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-1 hover:bg-emerald-700 disabled:opacity-60"
              >
                {loadingRural && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                Szukaj sal gminnych
              </button>
            </div>
          </div>

          {loadingRural && (
            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Wczytywanie sal...
            </p>
          )}
          {!loadingRural && ruralVendors.length === 0 && (
            <p className="text-xs text-slate-500">
              Brak wyników dla wybranych filtrów. Spróbuj zmienić
              kryteria wyszukiwania.
            </p>
          )}

          {/* Layout: lista + mapa obok siebie */}
          {ruralVendors.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)] gap-4">
              {/* Lista */}
              <div className="space-y-3">
                {ruralVendors.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">
                        {v.name}
                      </span>
                      {v.county && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          {v.county}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-600 mb-1">
                      <MapPin className="w-3 h-3" />
                      <span>{v.address}</span>
                    </div>
                    {v.max_participants && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mb-1">
                        <Users className="w-3 h-3" />
                        <span>
                          Maks. liczba uczestników:{" "}
                          {v.max_participants}
                        </span>
                      </div>
                    )}
                    {v.equipment && (
                      <p className="text-[11px] text-slate-500 mb-1">
                        <span className="font-semibold">
                          Wyposażenie:
                        </span>{" "}
                        {v.equipment}
                      </p>
                    )}
                    {v.rental_info && (
                      <p className="text-[11px] text-slate-500 mb-1">
                        <span className="font-semibold">
                          Informacje dot. wynajmu:
                        </span>{" "}
                        {v.rental_info}
                      </p>
                    )}
                    {v.pricing && (
                      <p className="text-[11px] text-slate-500">
                        <span className="font-semibold">
                          Stawki:
                        </span>{" "}
                        {v.pricing}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Mapa */}
              <div className="mt-4 min-h-[420px]">
                <RuralVenuesMap venues={ruralVendors} />
              </div>

            </div>
          )}
        </section>

      </div>
    </div>
  );
}
