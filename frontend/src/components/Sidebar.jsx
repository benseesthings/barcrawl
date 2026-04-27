import { useState, useRef } from 'react'
import { Autocomplete } from '@react-google-maps/api'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const INPUT_CLASS =
  'w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-amber-400 focus:outline-none placeholder-gray-500'

function PriceLevel({ level }) {
  if (level == null) return null
  return (
    <span className="text-emerald-400 text-xs font-medium">
      {'$'.repeat(Math.max(1, level))}
    </span>
  )
}

function StarRating({ rating }) {
  if (rating == null) return null
  return (
    <span className="text-yellow-400 text-xs font-medium">
      ★ {rating.toFixed(1)}
    </span>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white inline-block"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

export default function Sidebar({
  isLoaded,
  route,
  bars,
  crawlBars,
  selectedBar,
  onRouteFound,
  onRouteClear,
  onBarsFound,
  onBarSelect,
  onAddToCrawl,
  onRemoveFromCrawl,
}) {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState('')

const acOrigin = useRef(null)
  const acDest = useRef(null)
  const originInputRef = useRef(null)
  const destInputRef = useRef(null)

  const planRoute = async (originVal, destVal) => {
    if (!originVal.trim() || !destVal.trim()) return
    setLoading(true)
    setError('')
    try {
      setLoadingStatus('Planning route…')
      const routeRes = await fetch(`${API}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: originVal.trim(), destination: destVal.trim() }),
      })
      const routeData = await routeRes.json()
      if (!routeRes.ok) throw new Error(routeData.detail || 'Failed to get route')
      onRouteFound(routeData)

      setLoadingStatus('Finding bars…')
      const barsRes = await fetch(`${API}/api/bars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polyline: routeData.polyline }),
      })
      const barsData = await barsRes.json()
      if (!barsRes.ok) throw new Error(barsData.detail || 'Failed to find bars')
      onBarsFound(barsData.bars)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setLoadingStatus('')
    }
  }

  const onOriginPlaceChanged = () => {
    const displayText = originInputRef.current?.value
    if (displayText) {
      setOrigin(displayText)
      if (destination.trim()) planRoute(displayText, destination)
    }
  }

  const onDestPlaceChanged = () => {
    const displayText = destInputRef.current?.value
    if (displayText) {
      setDestination(displayText)
      if (origin.trim()) planRoute(origin, displayText)
    }
  }

  const crawlIds = new Set(crawlBars.map((b) => b.place_id))
  const candidateBars = bars.filter((b) => !crawlIds.has(b.place_id))

  const handleExport = () => {
    const waypoints = crawlBars.map((b) => `${b.lat},${b.lng}`).join('|')
    const url = new URL('https://www.google.com/maps/dir/')
    url.searchParams.set('api', '1')
    url.searchParams.set('origin', origin.trim())
    url.searchParams.set('destination', destination.trim())
    url.searchParams.set('waypoints', waypoints)
    url.searchParams.set('travelmode', 'walking')
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }

  return (
    <aside className="w-80 flex-shrink-0 h-full bg-gray-900 text-white flex flex-col overflow-hidden border-r border-gray-700">
      {/* Header */}
      <div className="px-5 py-4 bg-gray-800 border-b border-gray-700">
        <h1 className="text-xl font-bold text-amber-400 tracking-tight">Bar Crawl</h1>
        <p className="text-xs text-gray-400 mt-0.5">Find bars along your walking route</p>
      </div>

      {/* Route inputs */}
      <div className="px-4 py-4 space-y-3 border-b border-gray-700">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
            From
          </label>
          {isLoaded ? (
            <Autocomplete
              onLoad={(ac) => { acOrigin.current = ac }}
              onPlaceChanged={onOriginPlaceChanged}
            >
              <input
                ref={originInputRef}
                value={origin}
                onChange={(e) => { setOrigin(e.target.value); if (route) onRouteClear() }}
                placeholder="e.g. Painted Ladies, SF"
                className={INPUT_CLASS}
              />
            </Autocomplete>
          ) : (
            <input
              ref={originInputRef}
              value={origin}
              onChange={(e) => { setOrigin(e.target.value); if (route) onRouteClear() }}
              placeholder="e.g. Painted Ladies, SF"
              className={INPUT_CLASS}
            />
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
            To
          </label>
          {isLoaded ? (
            <Autocomplete
              onLoad={(ac) => { acDest.current = ac }}
              onPlaceChanged={onDestPlaceChanged}
            >
              <input
                ref={destInputRef}
                value={destination}
                onChange={(e) => { setDestination(e.target.value); if (route) onRouteClear() }}
                placeholder="e.g. Marina Green, SF"
                className={INPUT_CLASS}
              />
            </Autocomplete>
          ) : (
            <input
              ref={destInputRef}
              value={destination}
              onChange={(e) => { setDestination(e.target.value); if (route) onRouteClear() }}
              placeholder="e.g. Marina Green, SF"
              className={INPUT_CLASS}
            />
          )}
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Spinner /> {loadingStatus}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-900/40 border border-red-700/60 rounded-lg text-red-300 text-xs leading-relaxed">
          {error}
        </div>
      )}

      {/* Bar lists */}
      {bars.length > 0 && (
        <>

          {/* Your Crawl — fixed, does not scroll away */}
          {crawlBars.length > 0 && (
            <div className="flex-shrink-0 border-b border-gray-700 overflow-y-auto max-h-64">
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                    Your Crawl — {crawlBars.length} stop{crawlBars.length !== 1 ? 's' : ''}
                  </h2>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap"
                    title="Open in Google Maps"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                    Export to Maps
                  </button>
                </div>
              </div>
              <ul className="px-3 pb-2 space-y-1">
                {crawlBars.map((bar, idx) => {
                  const isSelected = selectedBar?.place_id === bar.place_id
                  return (
                    <li key={bar.place_id}>
                      <div
                        className={`w-full text-left px-3 py-3 rounded-xl border ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/40 shadow-sm'
                            : 'bg-gray-800/60 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={() => onBarSelect(isSelected ? null : bar)}
                            className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
                          >
                            <span
                              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                                isSelected ? 'bg-amber-500 text-white' : 'bg-orange-500 text-white'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium leading-snug truncate">
                                {bar.name}
                              </p>
                              {bar.vicinity && (
                                <p className="text-gray-500 text-xs truncate mt-0.5">{bar.vicinity}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <StarRating rating={bar.rating} />
                                <PriceLevel level={bar.price_level} />
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => onRemoveFromCrawl(bar)}
                            className="flex-shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Remove from crawl"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {candidateBars.length > 0 && (
                <div className="mx-4 border-t border-gray-700/60 mb-1" />
              )}
            </div>
          )}

          {/* Nearby Bars — scrollable */}
          {candidateBars.length > 0 && (
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 pt-3 pb-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Nearby Bars — {candidateBars.length} bar{candidateBars.length !== 1 ? 's' : ''}
                </h2>
                {route && crawlBars.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {route.distance} · {route.duration} walking
                  </p>
                )}
              </div>
              <ul className="px-3 pb-4 space-y-1">
                {candidateBars.map((bar) => {
                  const isSelected = selectedBar?.place_id === bar.place_id
                  return (
                    <li key={bar.place_id}>
                      <div
                        className={`w-full text-left px-3 py-3 rounded-xl border ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/30 shadow-sm'
                            : 'bg-gray-800/40 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={() => onBarSelect(isSelected ? null : bar)}
                            className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
                          >
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-slate-500 mt-2" />
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-300 text-sm font-medium leading-snug truncate">
                                {bar.name}
                              </p>
                              {bar.vicinity && (
                                <p className="text-gray-600 text-xs truncate mt-0.5">{bar.vicinity}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <StarRating rating={bar.rating} />
                                <PriceLevel level={bar.price_level} />
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => onAddToCrawl(bar)}
                            className="flex-shrink-0 mt-0.5 px-2 py-0.5 text-xs font-semibold rounded-md text-indigo-400 border border-indigo-500/40 hover:bg-indigo-500/15 hover:text-indigo-300 transition-colors"
                            title="Add to crawl"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {bars.length === 0 && !loading && (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-gray-600 text-sm text-center leading-relaxed">
            Enter a start and end point to plan your bar crawl.
          </p>
        </div>
      )}
    </aside>
  )
}
