import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import type { Vendor, VendorLocation } from "../../types/vendor";

type Props = {
  venues: Vendor[];
  selectedId?: string | null;
  onSelect?: (vendor: Vendor) => void;
};

type VendorWithCoords = Vendor & {
  _coords: VendorLocation;
};

// Leaflet default icons potrafią się “gubić” w Vite, więc dajemy własne URL-e (CDN).
// Możesz to później przenieść do assetsów lokalnych.
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// “Selected” — złoty (ładnie pasuje do CeremoDay).
// To jest gotowa ikona, stabilna i lekka.
const selectedIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function RuralVenuesMap({ venues, selectedId, onSelect }: Props) {
  // Normalizacja współrzędnych:
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

    const coords: VendorLocation = { lat: latCandidate, lng: lngCandidate };
    return [{ ...v, _coords: coords }];
  });

  const defaultCenter: LatLngExpression = [52.0, 19.0];

  const selected = venuesWithCoords.find((v) => v.id === selectedId) ?? null;

  const center: LatLngExpression =
    selected
      ? [selected._coords.lat, selected._coords.lng]
      : venuesWithCoords.length > 0
      ? [venuesWithCoords[0]._coords.lat, venuesWithCoords[0]._coords.lng]
      : defaultCenter;

  return (
    <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      <MapContainer center={center} zoom={selected ? 12 : 7} scrollWheelZoom className="w-full h-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {venuesWithCoords.map((v) => {
          const position: LatLngExpression = [v._coords.lat, v._coords.lng];
          const isSelected = v.id === selectedId;

          return (
            <Marker
              key={v.id}
              position={position}
              icon={isSelected ? selectedIcon : defaultIcon}
              eventHandlers={{
                click: () => onSelect?.(v),
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold mb-1">{v.name}</div>
                  <div>{v.address}</div>

                  {v.max_participants != null && (
                    <div className="mt-1">Max. uczestników: {v.max_participants}</div>
                  )}

                  {v.county && <div className="mt-1 text-slate-500">Powiat: {v.county}</div>}

                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-[11px] underline text-blue-600"
                      onClick={() => onSelect?.(v)}
                    >
                      Pokaż szczegóły
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
