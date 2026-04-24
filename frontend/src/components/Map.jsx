import { useEffect, useRef, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Polyline, Marker, InfoWindow } from '@react-google-maps/api'

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }
const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 }
const DEFAULT_ZOOM = 13

// Decode a Google-encoded polyline string into [{lat, lng}] path.
function decodePolyline(encoded) {
  const points = []
  let index = 0, lat = 0, lng = 0
  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    shift = 0; result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

function buildMarkerIcon(stopNumber, isSelected) {
  const bg = isSelected ? '#f59e0b' : '#f97316'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <circle cx="18" cy="18" r="16" fill="${bg}" stroke="white" stroke-width="2.5"/>
      <text x="18" y="23" text-anchor="middle" fill="white"
            font-size="13" font-weight="700" font-family="Arial,sans-serif">${stopNumber}</text>
      <polygon points="18,42 11,29 25,29" fill="${bg}"/>
    </svg>`.trim()
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(36, 44),
    anchor: new window.google.maps.Point(18, 44),
  }
}

const MAP_OPTIONS = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControlOptions: { position: 3 /* RIGHT_TOP */ },
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
}

const POLYLINE_OPTIONS = {
  strokeColor: '#6366f1',
  strokeWeight: 5,
  strokeOpacity: 0.85,
}

export default function Map({ route, bars, selectedBar, onBarSelect }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  })

  const mapRef = useRef(null)
  const routePath = route ? decodePolyline(route.polyline) : []

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  // Fit map to route + bar bounds whenever either changes.
  useEffect(() => {
    if (!mapRef.current || routePath.length === 0) return
    const bounds = new window.google.maps.LatLngBounds()
    routePath.forEach((p) => bounds.extend(p))
    bars.forEach((b) => bounds.extend({ lat: b.lat, lng: b.lng }))
    mapRef.current.fitBounds(bounds, 60)
  }, [route, bars])

  // Pan to a bar when it is selected from the sidebar.
  useEffect(() => {
    if (selectedBar && mapRef.current) {
      mapRef.current.panTo({ lat: selectedBar.lat, lng: selectedBar.lng })
    }
  }, [selectedBar])

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg className="animate-spin h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Loading map…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 h-full">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        options={MAP_OPTIONS}
        onLoad={onMapLoad}
      >
        {/* Walking route polyline */}
        {routePath.length > 0 && (
          <Polyline path={routePath} options={POLYLINE_OPTIONS} />
        )}

        {/* Bar markers */}
        {bars.map((bar, idx) => {
          const isSelected = selectedBar?.place_id === bar.place_id
          return (
            <Marker
              key={bar.place_id}
              position={{ lat: bar.lat, lng: bar.lng }}
              icon={buildMarkerIcon(idx + 1, isSelected)}
              zIndex={isSelected ? 999 : idx}
              onClick={() => onBarSelect(isSelected ? null : bar)}
            />
          )
        })}

        {/* Info window for selected bar */}
        {selectedBar && (
          <InfoWindow
            position={{ lat: selectedBar.lat, lng: selectedBar.lng }}
            options={{ pixelOffset: new window.google.maps.Size(0, -44) }}
            onCloseClick={() => onBarSelect(null)}
          >
            <div style={{ minWidth: 160, fontFamily: 'Arial, sans-serif' }}>
              <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 4px', color: '#111' }}>
                {selectedBar.name}
              </p>
              {selectedBar.vicinity && (
                <p style={{ fontSize: 12, color: '#555', margin: '0 0 6px' }}>
                  {selectedBar.vicinity}
                </p>
              )}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {selectedBar.rating != null && (
                  <span style={{ color: '#d97706', fontSize: 12, fontWeight: 600 }}>
                    ★ {selectedBar.rating.toFixed(1)}
                  </span>
                )}
                {selectedBar.price_level != null && (
                  <span style={{ color: '#059669', fontSize: 12, fontWeight: 600 }}>
                    {'$'.repeat(Math.max(1, selectedBar.price_level))}
                  </span>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
