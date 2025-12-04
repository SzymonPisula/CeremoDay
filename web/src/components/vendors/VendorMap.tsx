import { useEffect, useRef } from "react";
import type { Vendor } from "../../types/vendor";

interface VendorMapProps {
  vendors: Vendor[];
  center: { lat: number; lng: number };
}

export default function VendorMap({ vendors, center }: VendorMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
    });
  }, [center]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    vendors.forEach(v => {
      new google.maps.Marker({
        position: { lat: v.lat, lng: v.lng },
        map: mapInstanceRef.current,
        title: v.name,
      });
    });
  }, [vendors]);

  return <div ref={mapRef} className="w-full h-full rounded" />;
}
