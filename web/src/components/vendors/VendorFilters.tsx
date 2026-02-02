// CeremoDay/web/src/components/vendors/VendorFilters.tsx
import type { VendorType } from "../../types/vendor";

interface VendorFiltersProps {
  selected: VendorType;
  onSelect: (category: VendorType) => void;
}

/**
 * VendorType w projekcie (web/src/types/vendor.ts):
 * "venue" | "catering" | "music" | "photo_video" | "decorations" | "transport" | "other"
 */
const categories: VendorType[] = [
  "venue",
  "catering",
  "music",
  "photo_video",
  "decorations",
  "transport",
  "other",
];

export default function VendorFilters({ selected, onSelect }: VendorFiltersProps) {
  return (
    <div className="flex flex-col gap-2 p-2 border-r border-white/10">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`p-2 rounded-lg text-sm transition ${
            selected === cat
              ? "bg-amber-500/20 text-white"
              : "bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          {label(cat)}
        </button>
      ))}
    </div>
  );
}

function label(cat: VendorType) {
  switch (cat) {
    case "venue":
      return "Sala / miejsce";
    case "catering":
      return "Catering";
    case "music":
      return "Muzyka (DJ / zespół)";
    case "photo_video":
      return "Foto / wideo";
    case "decorations":
      return "Dekoracje / florystyka";
    case "transport":
      return "Transport";
    case "other":
      return "Inne";
    default:
      return String(cat);
  }
}
