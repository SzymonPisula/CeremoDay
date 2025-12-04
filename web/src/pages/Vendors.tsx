import React, { useEffect, useState } from "react";
import { getVendors } from "../lib/googleApi";
import type { Vendor } from "../types/vendor";

export const Vendors: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getVendors(eventId);
        setVendors(data);
      } catch (err) {
        setError("Nie udało się pobrać vendorów");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [eventId]);

  if (loading) return <div>Ładowanie vendorów...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!vendors.length) return <div>Brak dostępnych vendorów w tej lokalizacji.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vendors.map((vendor) => (
        <div key={vendor.place_id} className="p-4 border rounded shadow">
          <h3 className="font-bold">{vendor.name}</h3>
          <p>{vendor.vicinity}</p>
          {vendor.rating && <p>⭐ {vendor.rating}</p>}
        </div>
      ))}
    </div>
  );
};
