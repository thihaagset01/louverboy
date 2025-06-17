import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Component to handle map position changes
function MapUpdater({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  
  return null;
}

// Component to handle map click events properly
function MapClickHandler({ onMapClick }) {
  const map = useMapEvents({
    click: (e) => {
      console.log('Map clicked at:', e.latlng);
      onMapClick(e);
    }
  });
  
  return null;
}

function LocationMap({ coordinates, location, onLocationSelect }) {
  // Check if we have valid coordinates
  const hasValidCoordinates = coordinates && Array.isArray(coordinates) && coordinates.length === 2;
  
  const handleMapClick = (e) => {
    if (onLocationSelect && e && e.latlng) {
      console.log('Map clicked at:', e.latlng);
      onLocationSelect([e.latlng.lat, e.latlng.lng]);
    }
  };

  return (
    <div className="location-map-container">
      {hasValidCoordinates ? (
        <>
          <MapContainer 
            center={coordinates} 
            zoom={13} 
            style={{ height: '300px', width: '100%', borderRadius: '8px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={coordinates}>
              <Popup>
                {location || 'Selected Location'}
              </Popup>
            </Marker>
            <MapUpdater center={coordinates} />
            {/* Use the useMapEvents hook to properly capture map clicks */}
            {onLocationSelect && (
              <MapClickHandler onMapClick={handleMapClick} />
            )}
          </MapContainer>
          {onLocationSelect && (
            <div className="map-instructions">
              Click on the map to select a precise location
            </div>
          )}
        </>
      ) : (
        <div className="map-placeholder">
          <p>Enter a valid location to display the map</p>
        </div>
      )}
    </div>
  );
}

export default LocationMap;
