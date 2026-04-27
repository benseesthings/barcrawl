import { useState } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
import Sidebar from './components/Sidebar'
import Map from './components/Map'

const LIBRARIES = ['places']


export default function App() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  })

  const [route, setRoute] = useState(null)
  const [bars, setBars] = useState([])
  const [crawlBars, setCrawlBars] = useState([])
  const [selectedBar, setSelectedBar] = useState(null)

  const handleRouteFound = (data) => {
    setRoute(data)
    setBars([])
    setCrawlBars([])
    setSelectedBar(null)
  }

  const handleRouteClear = () => {
    setRoute(null)
    setBars([])
    setCrawlBars([])
    setSelectedBar(null)
  }

  const handleBarsFound = (newBars) => {
    setBars(newBars)
    setCrawlBars([])
    setSelectedBar(null)
  }

  const handleAddToCrawl = (bar) => {
    setCrawlBars((prev) => {
      const updated = [...prev, bar]
      return updated.sort((a, b) =>
        bars.findIndex(x => x.place_id === a.place_id) -
        bars.findIndex(x => x.place_id === b.place_id)
      )
    })
  }

  const handleRemoveFromCrawl = (bar) => {
    setCrawlBars((prev) => prev.filter((b) => b.place_id !== bar.place_id))
  }

  return (
    <div className="flex flex-col-reverse md:flex-row h-screen w-screen overflow-hidden">
      <Sidebar
        isLoaded={isLoaded}
        route={route}
        bars={bars}
        crawlBars={crawlBars}
        selectedBar={selectedBar}
        onRouteFound={handleRouteFound}
        onRouteClear={handleRouteClear}
        onBarsFound={handleBarsFound}
        onBarSelect={setSelectedBar}
        onAddToCrawl={handleAddToCrawl}
        onRemoveFromCrawl={handleRemoveFromCrawl}
      />
      <Map
        isLoaded={isLoaded}
        route={route}
        bars={bars}
        crawlBars={crawlBars}
        selectedBar={selectedBar}
        onBarSelect={setSelectedBar}
        onAddToCrawl={handleAddToCrawl}
        onRemoveFromCrawl={handleRemoveFromCrawl}
      />
    </div>
  )
}
