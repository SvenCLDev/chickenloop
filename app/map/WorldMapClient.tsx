'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  href: string;
  title: string;
  subtitle?: string;
}

const DEFAULT_CENTER: [number, number] = [25, 10];
const DEFAULT_ZOOM = 2;

interface WorldMapClientProps {
  points: MapPoint[];
}

export default function WorldMapClient({ points }: WorldMapClientProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point) => (
        <Marker key={point.id} position={[point.lat, point.lng]}>
          <Popup>
            <div className="min-w-[160px]">
              <p className="font-semibold text-gray-900">{point.title}</p>
              {point.subtitle && (
                <p className="text-sm text-gray-600 mt-0.5">{point.subtitle}</p>
              )}
              <Link
                href={point.href}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline block mt-1"
              >
                View details →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
