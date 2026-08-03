'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: '<div style="background-color: ' + color + '; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const userLocationIcon = L.divIcon({
  className: 'user-location-icon',
  html: '<div style="width: 16px; height: 16px; border-radius: 50%; background: #3B82F6; border: 3px solid white; box-shadow: 0 0 0 3px rgba(59,130,246,0.3), 0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

interface MapProps {
  issues: any[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  userLocation: [number, number] | null;
  radiusMeters: number;
}

function MapEvents({ onBoundsChange }: { onBoundsChange: (b: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);

  return null;
}

// Component to fly map to user location once available
function FlyToUser({ location }: { location: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(location, 14, { duration: 1.5 });
  }, [location, map]);
  return null;
}

export default function MapComponents({ issues, selected, onSelect, onBoundsChange, userLocation, radiusMeters }: MapProps) {
  const defaultCenter: [number, number] = userLocation || [20.5937, 78.9629]; // Center of India as fallback

  return (
    <MapContainer 
      center={defaultCenter}
      zoom={userLocation ? 14 : 5} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <MapEvents onBoundsChange={onBoundsChange} />

      {/* Fly to user once location is acquired */}
      {userLocation && <FlyToUser location={userLocation} />}

      {/* User location marker */}
      {userLocation && (
        <>
          <Circle
            center={userLocation}
            radius={radiusMeters}
            pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.06, weight: 1.5, dashArray: '6 4' }}
          />
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup><div style={{ fontWeight: 700, fontSize: 13 }}>Your Location</div></Popup>
          </Marker>
        </>
      )}
      
      <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
        {issues.map(issue => {
          let color = '#EA580C';
          if (issue.status === 'REPORTED') color = '#6B7280';
          if (issue.status === 'ASSIGNED' || issue.status === 'DEPARTMENT_ASSIGNED' || issue.status === 'EMPLOYEE_ASSIGNED') color = '#2563EB';
          if (issue.status === 'IN_PROGRESS') color = '#EA580C';
          if (issue.status === 'COMPLETED' || issue.status === 'APPROVED' || issue.status === 'CLOSED') color = '#16A34A';
          if (issue.status === 'COMMUNITY_REVIEW' || issue.status === 'SUBMITTED_FOR_APPROVAL') color = '#9333EA';

          const lat = issue.location_lat;
          const lng = issue.location_lng;
          if (!lat || !lng) return null;

          return (
            <Marker
              key={issue.id}
              position={[lat, lng]}
              icon={createCustomIcon(color)}
              eventHandlers={{ click: () => onSelect(issue.id) }}
            >
              {selected === issue.id && (
                <Popup>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{issue.title}</div>
                  <div style={{ fontSize: 11, color: '#5F5E5A', marginBottom: 2 }}>{issue.issue_type}</div>
                  {issue.location_label && (
                    <div style={{ fontSize: 10, color: '#888780' }}>{issue.location_label.split(',').slice(0, 2).join(',')}</div>
                  )}
                </Popup>
              )}
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
