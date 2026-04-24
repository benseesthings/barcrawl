import { useState, useRef } from 'react'
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
  onBarsFound,
  onBarSelect,
}) {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [loadingBars, setLoadingBars] = useState(false)
  const [error, setError] = useState('')

  // Autocomplete instance refs
  const acOrigin = useRef(null)
  const acDest = useRef(null)

  const onOriginPlaceChanged = () => {
    const place = acOrigin.current?.getPlace()
    if (place) setOrigin(place.formatted_address || place.name || '')
  }

  const onDestPlaceChanged = () => {
    const place = acDest.current?.getPlace()
    if (place) setDestination(place.formatted_address || place.name || '')
  }

  const handlePlanRoute = async () => {
    if (!origin.trim() || !destination.trim()) return
    setLoadingRoute(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: origin.trim(), destination: destination.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to get route')
      onRouteFound(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingRoute(false)
    }
  }

  const handleFindBars = async () => {
    if (!route) return
    setLoadingBars(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/bars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polyline: route.polyline }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to find bars')
      onBarsFound(data.bars)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingBars(false)
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
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Painted Ladies, SF"
                className={INPUT_CLASS}
              />
            </Autocomplete>
          ) : (
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
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
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Marina Green, SF"
                className={INPUT_CLASS}
              />
            </Autocomplete>
          ) : (
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Marina Green, SF"
              className={INPUT_CLASS}
            />
          )}
        </div>
        <button
          onClick={handlePlanRoute}
          disabled={loadingRoute || !origin.trim() || !destination.trim()}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loadingRoute ? <><Spinner /> Planning…</> : 'Plan Route'}
        </button>
      </div>

      {/* Route summary + Find Bars */}
      {route && (
        <div className="px-4 py-3 border-b border-gray-700 space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-gray-300">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {route.distance}
            </span>
            <span className="flex items-center gap-1.5 text-gray-300">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {route.duration}
            </span>
          </div>
          <button
            onClick={handleFindBars}
            disabled={loadingBars}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loadingBars ? <><Spinner /> Searching…</> : 'Find Bars Along Route'}
          </button>
        </div>
      )}

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
            <p className="text-xs text-gray-600 mt-0.5">Ordered by position along route</p>
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
      {bars.length === 0 && !loadingBars && (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-gray-600 text-sm text-center leading-relaxed">
            {route
              ? 'Click "Find Bars Along Route" to discover bars on your walk.'
              : 'Enter a start and end point to plan your bar crawl.'}
          </p>
        </div>
      )}
    </aside>
  )
}
