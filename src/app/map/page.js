'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

// Dynamic import to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg">Loading map...</div>
    </div>
  )
})

export default function MapPage() {
  const [coordinates, setCoordinates] = useState({ lat: 40.7128, lng: -74.0060 }) // Default to NYC
  const [hasUserLocation, setHasUserLocation] = useState(false)
  const [locationError, setLocationError] = useState(null)

  const handleLocationClick = () => {
    setLocationError(null)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setHasUserLocation(true)
          setLocationError(null)
        },
        (error) => {
          console.error('Error getting location:', error)
          let errorMessage = 'Could not get your location. '
          
          switch(error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage += 'Location access was denied. Please enable location permissions in your browser settings.'
              break
            case 2: // POSITION_UNAVAILABLE
              errorMessage += 'Location information is unavailable.'
              break
            case 3: // TIMEOUT
              errorMessage += 'Location request timed out.'
              break
            default:
              errorMessage += 'An unknown error occurred.'
              break
          }
          
          setLocationError(errorMessage)
          setHasUserLocation(false)
        }
      )
    } else {
      const errorMessage = 'Geolocation is not supported by this browser.'
      setLocationError(errorMessage)
      setHasUserLocation(false)
    }
  }

  return (
    <div className="relative h-screen w-full">
      {hasUserLocation ? (
        <>
          {/* Header */}
          <div className="absolute top-4 left-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800">Interactive Map</h1>
              <div className="flex gap-2">
                <button
                  onClick={handleLocationClick}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📍 Refresh Location
                </button>
                <a
                  href="/"
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  🏠 Home
                </a>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <span className="text-green-600">✓ Using your location</span>
              <br />
              Lat: {coordinates.lat.toFixed(4)}, Lng: {coordinates.lng.toFixed(4)}
            </div>
          </div>

          {/* Map */}
          <MapComponent coordinates={coordinates} hasUserLocation={hasUserLocation} />
        </>
      ) : (
        /* Location Request Screen */
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Location Required</h2>
              <p className="text-gray-600 mb-6">
                This interactive map application requires access to your location to provide the best experience. 
                Please allow location access to continue.
              </p>
              
              <button
                onClick={handleLocationClick}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium mb-4"
              >
                📍 Allow Location Access
              </button>
              
              {locationError && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                  <strong>Error:</strong> {locationError}
                  <div className="mt-2 text-xs">
                    Please check your browser settings and ensure location permissions are enabled for this site.
                  </div>
                </div>
              )}
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <a
                  href="/"
                  className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
                >
                  ← Back to Home
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
