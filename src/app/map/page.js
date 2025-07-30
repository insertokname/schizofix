'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg">Loading map...</div>
    </div>
  )
})

export default function MapPage() {
  const [coordinates, setCoordinates] = useState({ lat: 40.7128, lng: -74.0060 })
  const [hasUserLocation, setHasUserLocation] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [watchId, setWatchId] = useState(null)
  const [isWatching, setIsWatching] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [shouldRecenter, setShouldRecenter] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    startLocationWatch()
    
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [])

  const startLocationWatch = () => {
    setLocationError(null)
    setIsLoading(true)
    
    if (navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }

      const id = navigator.geolocation.watchPosition(
        (position) => {
          setCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setHasUserLocation(true)
          setLocationError(null)
          setIsWatching(true)
          setLastUpdate(new Date())
          setIsLoading(false)
          if (shouldRecenter) {
            setShouldRecenter(false)
          }
        },
        (error) => {
          console.error('Error getting location:', error)
          let errorMessage = 'Could not get your location. '
          
          switch(error.code) {
            case 1:
              errorMessage += 'Location access was denied. Please enable location permissions in your browser settings.'
              break
            case 2: 
              errorMessage += 'Location information is unavailable.'
              break
            case 3: 
              errorMessage += 'Location request timed out.'
              break
            default:
              errorMessage += 'An unknown error occurred.'
              break
          }
          
          setLocationError(errorMessage)
          setHasUserLocation(false)
          setIsWatching(false)
          setIsLoading(false)
        },
        options
      )
      
      setWatchId(id)
    } else {
      const errorMessage = 'Geolocation is not supported by this browser.'
      setLocationError(errorMessage)
      setHasUserLocation(false)
      setIsWatching(false)
      setIsLoading(false)
    }
  }

  const handleLocationClick = () => {
      if (isWatching && watchId) {
      navigator.geolocation.clearWatch(watchId)
      setIsWatching(false)
      setWatchId(null)
    } else {
      setShouldRecenter(true)
      startLocationWatch()
    }
  }

  const handleRecenterClick = () => {
    setShouldRecenter(true)
  }

  return (
    <div className="relative h-screen w-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Getting Your Location</h2>
              <p className="text-gray-600">
                Please allow location access when prompted to start using the map.
              </p>
            </div>
          </div>
        </div>
      ) : hasUserLocation ? (
        <>
          <div className="absolute top-4 left-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800">Interactive Map</h1>
              <div className="flex gap-2">
                <button
                  onClick={handleLocationClick}
                  className={`px-4 py-2 ${isWatching ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition-colors`}
                >
                  {isWatching ? 'Stop Tracking' : 'Start Tracking'}
                </button>
                {isWatching && (
                  <button
                    onClick={handleRecenterClick}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Recenter
                  </button>
                )}
                <a
                  href="/"
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Home
                </a>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-green-600">Using your location</span>
                {isWatching && (
                  <span className="flex items-center text-blue-600">
                    <span className="animate-pulse mr-1">●</span>
                    Live tracking
                  </span>
                )}
              </div>
              <div>
                Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
              </div>
              {lastUpdate && (
                <div className="text-xs text-gray-500">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          <MapComponent 
            coordinates={coordinates} 
            hasUserLocation={hasUserLocation} 
            initialCenter={shouldRecenter}
            onCentered={() => setShouldRecenter(false)}
          />
        </>
      ) : locationError ? (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-orange-100">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Location Access Required</h2>
              <p className="text-gray-600 mb-6">
                This interactive map application requires access to your location to provide live tracking. 
                Please allow location access to start real-time location updates.
              </p>
              
              <button
                onClick={handleLocationClick}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium mb-4"
              >
                Try Again
              </button>
              
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                <strong>Error:</strong> {locationError}
                <div className="mt-2 text-xs">
                  Please check your browser settings and ensure location permissions are enabled for this site.
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <a
                  href="/"
                  className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
                >
                  Back to Home
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
