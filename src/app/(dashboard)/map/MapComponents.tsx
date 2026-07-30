'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Helper component to update map view when selection changes
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function MapComponents({ issues, selected, onSelect }: { issues: any[], selected: string | null, onSelect: (id: string) => void }) {
  const center: [number, number] = [28.635, 77.224]; // Default to center area

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }} 
        zoomControl={false}
      >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
        
        {issues.map(issue => (
          <Marker 
            key={issue.id} 
            position={[issue.lat, issue.lng]} 
            icon={DefaultIcon}
            eventHandlers={{
              click: () => onSelect(issue.id)
            }}
          >
            <Popup>
              <div style={{ 
                  padding: '4px',
                  background: 'rgba(13, 13, 15, 0.95)',
                  minWidth: '160px'
              }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#ffffff', marginBottom: 4 }}>
                  {issue.emoji} {issue.title}
                </div>
                <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  📍 {issue.area?.split(',')[0]}
                </div>
                <div style={{ 
                  marginTop: 8, 
                  fontSize: 10, 
                  fontWeight: 800, 
                  color: issue.status === 'CLOSED' ? '#10b981' : '#fbbf24',
                  textTransform: 'uppercase',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  width: 'fit-content',
                  border: '0.5px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {issue.status.replace(/_/g, ' ')}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <ChangeView center={center} />
      </MapContainer>
    </div>
  );
}
