import { useState, useRef, useEffect } from 'react'
import { Autocomplete } from '@react-google-maps/api'

const API = 'http://localhost:8000'

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
  selectedBar,
  onRouteFound,
  onRouteClear,
  onBarsFound,
  onBarSelect,
}) {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState('')

  // Clear route whenever either input changes
  useEffect(() => {
    onRouteClear()
  }, [origin, destination]) // eslint-disable-line react-hooks/exhaustive-deps

  // Autocomplete instance refs
  const acOrigin = useRef(null)
  const acDest = useRef(null)
  // Input DOM refs — used to read the display text Google places in the field
  const originInputRef = useRef(null)
  const destInputRef = useRef(null)

  const onOriginPlaceChanged = () => {
    const displayText = originInputRef.current?.value
    if (displayText) { setOrigin(displayText); if (route) onRouteClear() }
  }

  const onDestPlaceChanged = () => {
    const displayText = destInputRef.current?.value
    if (displayText) { setDestination(displayText); if (route) onRouteClear() }
  }

  const handlePlanRoute = async () => {
    if (!origin.trim() || !destination.trim()) return
    setLoading(true)
    setError('')
    try {
      setLoadingStatus('Planning route…')
      const routeRes = await fetch(`${API}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: origin.trim(), destination: destination.trim() }),
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handlePlanRoute()
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
                onKeyDown={handleKeyDown}
                placeholder="e.g. Painted Ladies, SF"
                className={INPUT_CLASS}
              />
            </Autocomplete>
          ) : (
            <input
              ref={originInputRef}
              value={origin}
              onChange={(e) => { setOrigin(e.target.value); if (route) onRouteClear() }}
              onKeyDown={handleKeyDown}
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
                onKeyDown={handleKeyDown}
                placeholder="e.g. Marina Green, SF"
                className={INPUT_CLASS}
              />
            </Autocomplete>
          ) : (
            <input
              ref={destInputRef}
              value={destination}
              onChange={(e) => { setDestination(e.target.value); if (route) onRouteClear() }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Marina Green, SF"
              className={INPUT_CLASS}
            />
          )}
        </div>
        <button
          onClick={handlePlanRoute}
          disabled={loading || !origin.trim() || !destination.trim()}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? <><Spinner /> {loadingStatus}</> : 'Plan Route'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-900/40 border border-red-700/60 rounded-lg text-red-300 text-xs leading-relaxed">
          {error}
        </div>
      )}

      {/* Bar list */}
      {bars.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Crawl Stops — {bars.length} bar{bars.length !== 1 ? 's' : ''}
            </h2>
            {route && (
              <p className="text-xs text-gray-500 mt-1">
                {route.distance} · {route.duration} walking
              </p>
            )}
          </div>
          <ul className="px-3 pb-4 space-y-1">
            {bars.map((bar, idx) => {
              const isSelected = selectedBar?.place_id === bar.place_id
              return (
                <li key={bar.place_id}>
                  <button
                    onClick={() => onBarSelect(isSelected ? null : bar)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-all border ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/40 shadow-sm'
                        : 'bg-gray-800/60 border-transparent hover:bg-gray-700/60 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                          isSelected ? 'bg-amber-500 text-white' : 'bg-gray-700 text-amber-400'
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
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Empty states */}
      {bars.length === 0 && !loading && (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-gray-600 text-sm text-center leading-relaxed">
            {'Enter a start and end point to plan your bar crawl.'}
          </p>
        </div>
      )}
    </aside>
  )
}
