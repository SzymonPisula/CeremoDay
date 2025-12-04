import type { Vendor } from "../../types/vendor";

interface VendorListProps {
  vendors: Vendor[];
  onSelect: (vendor: Vendor) => void;
}

export default function VendorList({ vendors, onSelect }: VendorListProps) {
  return (
    <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-full">
      {vendors.map(v => (
        <div
          key={v.id}
          className="p-2 border rounded cursor-pointer hover:bg-gray-100"
          onClick={() => onSelect(v)}
        >
          <div className="font-semibold">{v.name}</div>
          <div className="text-sm text-gray-600">{v.address}</div>
          {v.rating && <div className="text-sm text-yellow-600">⭐ {v.rating}</div>}
        </div>
      ))}
    </div>
  );
}
