import type { VendorCategory } from "../../types/vendor";

interface VendorFiltersProps {
  selected: VendorCategory;
  onSelect: (category: VendorCategory) => void;
}

const categories: VendorCategory[] = ["catering","dj","florist","photographer","venue","other"];

export default function VendorFilters({ selected, onSelect }: VendorFiltersProps) {
  return (
    <div className="flex flex-col gap-2 p-2 border-r border-gray-200">
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`p-2 rounded ${
            selected === cat ? "bg-blue-500 text-white" : "bg-gray-100"
          }`}
        >
          {cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
      ))}
    </div>
  );
}
