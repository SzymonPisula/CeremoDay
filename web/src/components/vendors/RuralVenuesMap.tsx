// CeremoDay/web/src/components/vendors/RuralVenuesMap.tsx
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { Vendor, VendorLocation } from "../../types/vendor";

type Props = {
  venues: Vendor[];
};

type VendorWithCoords = Vendor & {
  _coords: VendorLocation;
};

export default function RuralVenuesMap({ venues }: Props) {
  console.log("🌍 RuralVenuesMap renderuje się, venues:", venues);

  // Normalizujemy źródło współrzędnych:
  //  1) vendor.location.lat/lng
  //  2) vendor.lat / vendor.lng (top-level)
  const venuesWithCoords: VendorWithCoords[] = venues.flatMap((v) => {
    const latCandidate = v.location?.lat ?? v.lat ?? null;
    const lngCandidate = v.location?.lng ?? v.lng ?? null;

    if (
      latCandidate === null ||
      lngCandidate === null ||
      typeof latCandidate !== "number" ||
      typeof lngCandidate !== "number" ||
      Number.isNaN(latCandidate) ||
      Number.isNaN(lngCandidate)
    ) {
      return [];
    }

    const coords: VendorLocation = {
      lat: latCandidate,
      lng: lngCandidate,
    };

    return [{ ...v, _coords: coords }];
  });

  console.log("📍 Liczba venue z koordynatami:", venuesWithCoords.length);
  if (venuesWithCoords.length > 0) {
    console.log(
      "📍 Przykładowe współrzędne:",
      venuesWithCoords.slice(0, 3).map((v) => ({
        id: v.id,
        lat: v._coords.lat,
        lng: v._coords.lng,
        name: v.name,
      }))
    );
  }

  const defaultCenter: LatLngExpression = [52.0, 19.0];

  const center: LatLngExpression =
    venuesWithCoords.length > 0
      ? [venuesWithCoords[0]._coords.lat, venuesWithCoords[0]._coords.lng]
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
          const position: LatLngExpression = [
            v._coords.lat,
            v._coords.lng,
          ];

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
                  {v.source === "RURAL" && (
                    <div className="mt-1 text-[10px] text-slate-400">
                      Źródło: baza gminna
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
