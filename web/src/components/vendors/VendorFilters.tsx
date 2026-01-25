// CeremoDay/web/src/components/vendors/VendorFilters.tsx
import type { VendorType } from "../../types/vendor";

interface VendorFiltersProps {
  selected: VendorType;
  onSelect: (category: VendorType) => void;
}

/**
 * VendorType w projekcie:
 * "HALL" | "CATERING" | "DJ" | "BAND" | "PHOTO" | "VIDEO" | "DECOR" | "TRANSPORT" | "OTHER"
 */
const categories: VendorType[] = [
  "HALL",
  "CATERING",
  "DJ",
  "BAND",
  "PHOTO",
  "VIDEO",
  "DECOR",
  "TRANSPORT",
  "OTHER",
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
    case "HALL":
      return "Sala / miejsce";
    case "CATERING":
      return "Catering";
    case "DJ":
      return "DJ";
    case "BAND":
      return "Zespół";
    case "PHOTO":
      return "Fotograf";
    case "VIDEO":
      return "Kamerzysta";
    case "DECOR":
      return "Dekoracje / florystyka";
    case "TRANSPORT":
      return "Transport";
    case "OTHER":
      return "Inne";
    default:
      return String(cat);
  }
}
