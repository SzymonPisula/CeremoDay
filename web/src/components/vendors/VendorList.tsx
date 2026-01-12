// web/src/components/vendors/VendorList.tsx
import { MapPin, Users, Building2 } from "lucide-react";

type BaseVenue = {
  id: string;
  name: string;
  address?: string | null;

  county?: string | null;
  max_participants?: number | null;
};

type Props<T extends BaseVenue> = {
  vendors: ReadonlyArray<T>;
  selectedId: string | null;
  onSelect: (v: T) => void;
};

function cx(...v: Array<string | false | undefined>) {
  return v.filter(Boolean).join(" ");
}

function nonEmpty(v?: string | null) {
  return !!v && v.trim().length > 0;
}

export default function VendorList<T extends BaseVenue>({ vendors, selectedId, onSelect }: Props<T>) {
  return (
    <div className="p-3">
      <div className="grid gap-3">
        {vendors.map((v) => {
          const active = v.id === selectedId;

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v)}
              className={cx(
                "w-full text-left rounded-2xl border transition",
                "bg-white/5 backdrop-blur-md",
                "px-4 py-4",
                active
                  ? "border-[#c8a04b]/45 shadow-[0_18px_50px_-30px_rgba(215,180,90,0.85)]"
                  : "border-white/10 hover:border-white/15 hover:bg-white/7"
              )}
            >
              {/* tytuł */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-white leading-snug truncate">
                    {v.name}
                  </div>

                  {/* adres (bez —) */}
                  {nonEmpty(v.address) ? (
                    <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
                      <MapPin className="w-4 h-4 text-white/55 shrink-0" />
                      <span className="truncate">{v.address}</span>
                    </div>
                  ) : null}
                </div>

                {/* mała ikonka "typ obiektu" */}
                <div className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-[#d7b45a]" />
                </div>
              </div>

              {/* metryki */}
              <div className="mt-3 grid grid-cols-1 gap-1.5">
                {typeof v.max_participants === "number" ? (
                  <div className="flex items-center gap-2 text-sm text-white/65">
                    <Users className="w-4 h-4 text-white/50 shrink-0" />
                    <span>
                      Max. uczestników:{" "}
                      <span className="text-white/85 font-medium">{v.max_participants}</span>
                    </span>
                  </div>
                ) : null}

                {nonEmpty(v.county) ? (
                  <div className="text-sm text-white/60">
                    Powiat: <span className="text-white/80 font-medium">{v.county}</span>
                  </div>
                ) : null}

                {/* jeśli brak danych meta — nie pokazuj nic (bez pustych kresek) */}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
