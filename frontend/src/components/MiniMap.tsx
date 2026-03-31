'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet 아이콘 fix
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface MiniMapProps {
  lat: number;
  lng: number;
  label?: string;
}

export default function MiniMap({ lat, lng, label }: MiniMapProps) {
  if (!lat || !lng) return null;

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ width: '100%', height: '100%', minHeight: 150 }}
      scrollWheelZoom={false}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <Marker position={[lat, lng]} icon={markerIcon}>
        {label && <Popup>{label}</Popup>}
      </Marker>
    </MapContainer>
  );
}
