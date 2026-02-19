'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [20, 0]; // fallback when coordinates missing (avoids Invalid LatLng (undefined, undefined))

interface DraggableMapProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number) => void;
  companyName?: string;
}

// Component to handle marker dragging
function DraggableMarker({ 
  position, 
  onDragEnd, 
  companyName 
}: { 
  position: [number, number]; 
  onDragEnd: (lat: number, lng: number) => void;
  companyName?: string;
}) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    // Fix for default marker icon in Next.js (only on client side)
    if (typeof window !== 'undefined') {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    }
  }, []);

  const handleDragEnd = () => {
    const marker = markerRef.current;
    if (marker) {
      const { lat, lng } = marker.getLatLng();
      onDragEnd(lat, lng);
    }
  };

  return (
    <Marker
      position={position}
      draggable={true}
      ref={markerRef}
      eventHandlers={{
        dragend: handleDragEnd,
      }}
    >
      <Popup>
        <strong>{companyName || 'Location'}</strong>
        <br />
        <span className="text-xs text-gray-600">
          Drag to fine-tune location
        </span>
      </Popup>
    </Marker>
  );
}

// Component to handle map click events (optional)
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to update map center when coordinates change
function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);

  return null;
}

export default function DraggableMap({ 
  latitude, 
  longitude, 
  onLocationChange,
  companyName 
}: DraggableMapProps) {
  const lat = typeof latitude === 'number' && Number.isFinite(latitude) ? latitude : DEFAULT_CENTER[0];
  const lng = typeof longitude === 'number' && Number.isFinite(longitude) ? longitude : DEFAULT_CENTER[1];
  const center: [number, number] = [lat, lng];

  const handleMapClick = (lat: number, lng: number) => {
    onLocationChange(lat, lng);
  };

  const handleMarkerDrag = (lat: number, lng: number) => {
    onLocationChange(lat, lng);
  };

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <DraggableMarker
        position={center}
        onDragEnd={handleMarkerDrag}
        companyName={companyName}
      />
      <MapClickHandler onClick={handleMapClick} />
      <MapUpdater lat={lat} lng={lng} />
    </MapContainer>
  );
}

