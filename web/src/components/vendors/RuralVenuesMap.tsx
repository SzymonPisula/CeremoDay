// CeremoDay/web/src/components/vendors/RuralVenuesMap.tsx
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { Vendor } from "../../types/vendor";

type VendorWithLatLng = Vendor & {
  lat?: number | null;
  lng?: number | null;
  // na wszelki wypadek – niektóre Vendor-y mogą mieć już location
  location?: {
    lat: number | null;
    lng: number | null;
  } | null;
};

type Props = {
  venues: VendorWithLatLng[];
};

export default function RuralVenuesMap({ venues }: Props) {
  console.log("🌍 RuralVenuesMap renderuje się, venues:", venues);

  const venuesWithCoords = venues.filter(
    (v): v is VendorWithLatLng & { lat: number; lng: number } => {
      const fromLocation =
        v.location?.lat != null && v.location?.lng != null;
      const fromRoot =
        typeof v.lat === "number" && typeof v.lng === "number";

      return fromLocation || fromRoot;
    }
  );

  console.log("📍 Liczba venue z koordynatami:", venuesWithCoords.length);

  const defaultCenter: LatLngExpression = [52.0, 19.0];

  const center: LatLngExpression =
    venuesWithCoords.length > 0
      ? [
          venuesWithCoords[0].location?.lat ?? venuesWithCoords[0].lat,
          venuesWithCoords[0].location?.lng ?? venuesWithCoords[0].lng,
        ]
      : defaultCenter;

  return (
    <div className="w-full h-[420px] rounded-xl overflow-hidden border border-slate-200">
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {venuesWithCoords.map((v) => {
          const markerLat = v.location?.lat ?? v.lat!;
          const markerLng = v.location?.lng ?? v.lng!;

          const position: LatLngExpression = [markerLat, markerLng];

          return (
            <Marker key={v.id} position={position}>
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold mb-1">{v.name}</div>
                  <div>{v.address}</div>
                  {v.max_participants != null && (
                    <div className="mt-1">
                      Max. uczestników: {v.max_participants}
                    </div>
                  )}
                  {v.county && (
                    <div className="mt-1 text-slate-500">
                      Powiat: {v.county}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
