import { useState } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
import Sidebar from './components/Sidebar'
import Map from './components/Map'

// Defined outside the component so the array reference is stable across renders.
const LIBRARIES = ['places']

// Minimal polyline decoder — used only for route-order sorting.
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

function sortBarsByRouteOrder(bars, polyline) {
  const routePoints = decodePolyline(polyline)
  return [...bars].sort((a, b) => {
    const idxOf = (bar) =>
      routePoints.reduce(
        (best, p, i) => {
          const d = (bar.lat - p.lat) ** 2 + (bar.lng - p.lng) ** 2
          return d < best.d ? { i, d } : best
        },
        { i: 0, d: Infinity }
      ).i
    return idxOf(a) - idxOf(b)
  })
}

export default function App() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  })

  const [route, setRoute] = useState(null)   // { polyline, distance, duration }
  const [bars, setBars] = useState([])
  const [selectedBar, setSelectedBar] = useState(null)

  const handleRouteFound = (data) => {
    setRoute(data)
    setBars([])
    setSelectedBar(null)
  }

  const handleRouteClear = () => {
    setRoute(null)
    setBars([])
    setSelectedBar(null)
  }

  const handleBarsFound = (newBars) => {
    const sorted = route?.polyline
      ? sortBarsByRouteOrder(newBars, route.polyline)
      : newBars
    setBars(sorted)
    setSelectedBar(null)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        isLoaded={isLoaded}
        route={route}
        bars={bars}
        selectedBar={selectedBar}
        onRouteFound={handleRouteFound}
        onRouteClear={handleRouteClear}
        onBarsFound={handleBarsFound}
        onBarSelect={setSelectedBar}
      />
      <Map
        isLoaded={isLoaded}
        route={route}
        bars={bars}
        selectedBar={selectedBar}
        onBarSelect={setSelectedBar}
      />
    </div>
  )
}
