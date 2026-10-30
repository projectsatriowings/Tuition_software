import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Locate, AlertTriangle, Layers, Navigation, RefreshCw, CheckCircle2 } from 'lucide-react';

// Fix leaflet default icon URLs in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface GeofenceMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  radius: number; // in metres
  onLocationChange: (lat: number, lng: number) => void;
  instituteName?: string;
  readOnly?: boolean;
}

export const GeofenceMapPicker: React.FC<GeofenceMapPickerProps> = ({
  latitude,
  longitude,
  radius,
  onLocationChange,
  instituteName = 'Tuition Institute',
  readOnly = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locatingCurrent, setLocatingCurrent] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Fallback coords: Chennai/Bengaluru/Delhi central
  const defaultLat = latitude ?? 13.0827;
  const defaultLng = longitude ?? 80.2707;

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // initialize only once

    try {
      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: latitude && longitude ? 17 : 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Create draggable marker
      const marker = L.marker([defaultLat, defaultLng], {
        draggable: !readOnly,
        title: instituteName,
      }).addTo(map);

      marker.bindPopup(`<b>${instituteName}</b><br/>Approved Geofence Center`).openPopup();

      // Create Geofence Circle (200m default)
      const circle = L.circle([defaultLat, defaultLng], {
        radius: radius || 200,
        color: '#4E342E',
        weight: 2,
        fillColor: '#8D6E63',
        fillOpacity: 0.25,
      }).addTo(map);

      markerRef.current = marker;
      circleRef.current = circle;
      mapInstanceRef.current = map;

      // Handle marker drag
      if (!readOnly) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          circle.setLatLng(pos);
          onLocationChange(pos.lat, pos.lng);
        });

        // Click on map to place marker
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          circle.setLatLng([lat, lng]);
          onLocationChange(lat, lng);
        });
      }

      // Invalidate size after rendering to fix tile clipping
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } catch (err: any) {
      console.error('[GeofenceMapPicker] Leaflet initialization error:', err);
      setMapError('Failed to load map. Please check internet connection or reload.');
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync radius changes with circle overlay
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  // Sync coordinate changes from props
  useEffect(() => {
    if (latitude != null && longitude != null && markerRef.current && circleRef.current && mapInstanceRef.current) {
      const curLatLng = markerRef.current.getLatLng();
      if (Math.abs(curLatLng.lat - latitude) > 0.00001 || Math.abs(curLatLng.lng - longitude) > 0.00001) {
        const newLatLng = new L.LatLng(latitude, longitude);
        markerRef.current.setLatLng(newLatLng);
        circleRef.current.setLatLng(newLatLng);
        mapInstanceRef.current.panTo(newLatLng);
      }
    }
  }, [latitude, longitude]);

  // Handle Search using Nominatim OpenStreetMap
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setSearchError(null);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(item.lat);
        const newLng = parseFloat(item.lon);

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          const latLng = new L.LatLng(newLat, newLng);
          markerRef.current.setLatLng(latLng);
          circleRef.current.setLatLng(latLng);
          mapInstanceRef.current.flyTo(latLng, 17, { duration: 1.5 });
          onLocationChange(newLat, newLng);
        }
      } else {
        setSearchError('Address not found. Please try a more specific query or click directly on the map.');
      }
    } catch (err: any) {
      console.error('[GeofenceMapPicker] Search error:', err);
      setSearchError('Search failed. Please try again or drag the pin directly.');
    } finally {
      setSearching(false);
    }
  };

  // Locate current position using device GPS
  const handleUseCurrentPosition = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by your browser or device.');
      return;
    }

    setLocatingCurrent(true);
    setSearchError(null);
    setLocationSuccessMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingCurrent(false);
        const { latitude: curLat, longitude: curLng, accuracy } = pos.coords;

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          const latLng = new L.LatLng(curLat, curLng);
          markerRef.current.setLatLng(latLng);
          circleRef.current.setLatLng(latLng);

          const accText = accuracy ? ` (Accuracy: ±${Math.round(accuracy)}m)` : '';
          markerRef.current
            .bindPopup(`<b>${instituteName}</b><br/>Locked to Your Current Location${accText}`)
            .openPopup();

          mapInstanceRef.current.flyTo(latLng, 18, { duration: 1.2 });
          onLocationChange(curLat, curLng);
          setLocationSuccessMsg(
            `GPS location locked: ${curLat.toFixed(6)}, ${curLng.toFixed(6)}${accText}. Click "Save Configuration" to confirm.`
          );
        }
      },
      (err) => {
        setLocatingCurrent(false);
        console.warn('[GeofenceMapPicker] Geolocation error:', err);
        if (err.code === 1) {
          setSearchError(
            'Location access permission was denied. Please click the padlock or site settings icon in your browser address bar, set Location to "Allow", and try again.'
          );
        } else if (err.code === 2) {
          setSearchError(
            'Unable to determine physical location. Please check that Windows Location Services are turned ON and device has internet/GPS connectivity.'
          );
        } else if (err.code === 3) {
          setSearchError(
            'GPS request timed out. Please click "Use My Current Location" again or search for your address.'
          );
        } else {
          setSearchError(`Failed to get location: ${err.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  };

  return (
    <div className="space-y-3">
      {/* Top Search & Actions bar */}
      {!readOnly && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8D6E63] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search address, landmark or area (e.g., T. Nagar, Chennai)..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D7CCC8] bg-white text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-3.5 py-2 text-xs font-semibold bg-[#8D6E63] text-white rounded-xl hover:bg-[#6D4C41] disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Prominent Current Location Button */}
          <button
            type="button"
            onClick={handleUseCurrentPosition}
            disabled={locatingCurrent}
            className="px-4 py-2 text-xs font-bold bg-[#4E342E] text-white rounded-xl hover:bg-[#3E2723] disabled:opacity-60 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 border border-[#3E2723] active:scale-[0.98]"
            title="Lock academy geofence to your exact current physical GPS location"
          >
            {locatingCurrent ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                <span>Acquiring GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5 text-amber-300" />
                <span>Use My Current Location</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Success Notification */}
      {locationSuccessMsg && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{locationSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setLocationSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold text-xs ml-3 shrink-0 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {searchError && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{searchError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSearchError(null)}
            className="text-red-700 hover:text-red-950 font-bold text-xs ml-3 shrink-0 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Map Container */}
      <div className="relative w-full h-[380px] rounded-xl overflow-hidden border border-[#D7CCC8] shadow-inner bg-[#EFEBE9]">
        {mapError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-[#6D4C41]">
            <AlertTriangle className="w-8 h-8 text-amber-600 mb-2" />
            <p className="text-sm font-semibold">{mapError}</p>
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full z-0" />
        )}

        {/* Floating coordinates badge */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-[#D7CCC8] text-[11px] text-[#4E342E] flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-[#8D6E63]" />
          <span>
            {latitude != null && longitude != null
              ? `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
              : 'Pin location not selected'}
          </span>
          <span className="text-[#8D6E63] font-bold">| Radius: {radius}m</span>
        </div>
      </div>

      <p className="text-[11px] text-[#6D4C41] flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5" />
        <span>
          Drag the brown pin or click anywhere on the map to set the institute center. The circular overlay indicates the {radius}-metre attendance geofence boundary.
        </span>
      </p>
    </div>
  );
};

