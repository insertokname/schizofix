'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useRef } from 'react'
import { useLocations } from '../providers/LocationsProvider'

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg">Loading map...</div>
    </div>
  )
})

function Joystick({ onMove }) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const joystickRef = useRef(null)
  const animationFrameRef = useRef(null)
  const lastTimeRef = useRef(Date.now())

  const centerX = 50
  const centerY = 50
  const maxDistance = 40

  useEffect(() => {
    if (isDragging && (position.x !== 0 || position.y !== 0)) {
      const updateMovement = () => {
        const currentTime = Date.now()
        const deltaTime = (currentTime - lastTimeRef.current) / 1000 // Convert to seconds
        lastTimeRef.current = currentTime

        const baseSpeed = 0.00005
        const deltaLat = -position.y * baseSpeed * deltaTime * (Math.abs(position.y) / maxDistance)
        const deltaLng = position.x * baseSpeed * deltaTime * (Math.abs(position.x) / maxDistance)

        onMove(deltaLat, deltaLng)

        if (isDragging && (position.x !== 0 || position.y !== 0)) {
          animationFrameRef.current = requestAnimationFrame(updateMovement)
        }
      }

      lastTimeRef.current = Date.now()
      animationFrameRef.current = requestAnimationFrame(updateMovement)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isDragging, position, onMove])

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
    updatePosition(e)
  }

  const handleMouseMove = (e) => {
    if (isDragging) {
      updatePosition(e)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setPosition({ x: 0, y: 0 })
  }

  const handleTouchStart = (e) => {
    e.preventDefault()
    setIsDragging(true)
    const touch = e.touches[0]
    updatePosition(touch)
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    if (isDragging && e.touches[0]) {
      const touch = e.touches[0]
      updatePosition(touch)
    }
  }

  const handleTouchEnd = (e) => {
    e.preventDefault()
    setIsDragging(false)
    setPosition({ x: 0, y: 0 })
  }

  const updatePosition = (e) => {
    if (!joystickRef.current) return

    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const clientX = e.clientX || e.pageX
    const clientY = e.clientY || e.pageY

    const x = clientX - rect.left - centerX
    const y = clientY - rect.top - centerY

    const distance = Math.sqrt(x * x + y * y)

    if (distance <= maxDistance) {
      setPosition({ x, y })
    } else {
      const angle = Math.atan2(y, x)
      setPosition({
        x: Math.cos(angle) * maxDistance,
        y: Math.sin(angle) * maxDistance
      })
    }
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd, { passive: false })

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging])

  return (
    <div className="relative">
      <div
        ref={joystickRef}
        className="w-24 h-24 bg-white bg-opacity-90 rounded-full border-4 border-black relative cursor-pointer select-none touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          className="w-6 h-6 bg-black rounded-full absolute border-2 border-gray-400 transition-transform duration-75 pointer-events-none"
          style={{
            left: `${centerX + position.x - 12}px`,
            top: `${centerY + position.y - 12}px`,
          }}
        />
      </div>
      <div className="text-center mt-2 text-sm text-black bg-white bg-opacity-90 rounded px-2 py-1 border border-black">
        Joystick
      </div>
    </div>
  )
}

export default function MapPage() {
  const [coordinates, setCoordinates] = useState({ lat: 40.7128, lng: -74.0060 })
  const [hasUserLocation, setHasUserLocation] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [watchId, setWatchId] = useState(null)
  const [isWatching, setIsWatching] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [shouldRecenter, setShouldRecenter] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [joystickMode, setJoystickMode] = useState(false)

  const { initializeLocations, initializeBossLocations, isInitialized, bossLocationsInitialized, clearSavedLocations, clearSavedBossLocations } = useLocations()
  const hasInitializedLocations = useRef(false)
  const hasInitializedBossLocations = useRef(false)
  const ignoreGPSUpdates = useRef(false)

  useEffect(() => {
    startLocationWatch()

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [])

  useEffect(() => {
    if (hasUserLocation && !hasInitializedLocations.current && !isInitialized) {
      console.log('Initializing locations for the first time...')
      initializeLocations(coordinates.lat, coordinates.lng)
      hasInitializedLocations.current = true
    }
  }, [hasUserLocation, coordinates.lat, coordinates.lng, initializeLocations, isInitialized])

  useEffect(() => {
    if (hasUserLocation && !hasInitializedBossLocations.current && !bossLocationsInitialized) {
      console.log('Initializing boss locations for the first time...')
      initializeBossLocations(coordinates.lat, coordinates.lng)
      hasInitializedBossLocations.current = true
    }
  }, [hasUserLocation, coordinates.lat, coordinates.lng, initializeBossLocations, bossLocationsInitialized])

  const startLocationWatch = () => {
    setLocationError(null)
    setIsLoading(true)
    ignoreGPSUpdates.current = false

    if (navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }

      const id = navigator.geolocation.watchPosition(
        (position) => {
          if (ignoreGPSUpdates.current) return

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

          switch (error.code) {
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
      ignoreGPSUpdates.current = true
    } else {
      setJoystickMode(false)
      ignoreGPSUpdates.current = false
      setShouldRecenter(true)
      startLocationWatch()
    }
  }

  const handleJoystickToggle = () => {
    if (joystickMode) {
      setJoystickMode(false)
      ignoreGPSUpdates.current = false
      setShouldRecenter(true)
      startLocationWatch()
    } else {
      ignoreGPSUpdates.current = true
      if (watchId) {
        navigator.geolocation.clearWatch(watchId)
        setWatchId(null)
      }
      setIsWatching(false)
      setJoystickMode(true)
    }
  }

  const handleJoystickMove = (deltaLat, deltaLng) => {
    setCoordinates(prev => ({
      lat: prev.lat + deltaLat,
      lng: prev.lng + deltaLng
    }))
    setLastUpdate(new Date())
  }

  const handleRecenterClick = () => {
    setShouldRecenter(true)
  }

  return (
    <div className="relative h-dvh w-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-dvh bg-black">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-black mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
              <h2 className="text-2xl font-bold text-black mb-2">Getting Your Location</h2>
              <p className="text-gray-800">
                Please allow location access when prompted to start using the map.
              </p>
            </div>
          </div>
        </div>
      ) : hasUserLocation ? (
        <>
          <div className="absolute bottom-8 left-4 z-[1000] flex flex-col gap-2">
            <button
              onClick={handleLocationClick}
              className={`px-3 py-2 text-sm ${isWatching ? 'bg-black text-white border border-white hover:bg-gray-800' : 'bg-white text-black border border-black hover:bg-gray-100'} rounded-lg transition-colors shadow-lg`}
            >
              {isWatching ? 'Stop Tracking' : 'Start Tracking'}
            </button>
            <button
              onClick={handleJoystickToggle}
              className={`px-3 py-2 text-sm ${joystickMode ? 'bg-black text-white border border-white hover:bg-gray-800' : 'bg-white text-black border border-black hover:bg-gray-100'} rounded-lg transition-colors shadow-lg`}
            >
              {joystickMode ? 'Exit Joystick' : 'Joystick Mode'}
            </button>
            {(isWatching || joystickMode) && (
              <button
                onClick={handleRecenterClick}
                className="px-3 py-2 text-sm bg-white text-black border border-black rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
              >
                Recenter
              </button>
            )}

            <button
              onClick={() => {
                clearSavedLocations()
                clearSavedBossLocations()
                hasInitializedLocations.current = false
                hasInitializedBossLocations.current = false
                if (hasUserLocation) {
                  initializeLocations(coordinates.lat, coordinates.lng)
                  initializeBossLocations(coordinates.lat, coordinates.lng)
                  hasInitializedLocations.current = true
                  hasInitializedBossLocations.current = true
                }
              }}
              className="px-3 py-2 text-sm bg-white text-black border border-black rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
              title="Clear saved locations and fetch new ones"
            >
              Refresh Places
            </button>
          </div>

          <MapComponent
            coordinates={coordinates}
            hasUserLocation={hasUserLocation}
            initialCenter={shouldRecenter}
            onCentered={() => setShouldRecenter(false)}
          />

          {joystickMode && (
            <div className="absolute bottom-8 right-8 z-[1000]">
              <Joystick onMove={handleJoystickMove} />
            </div>
          )}
        </>
      ) : locationError ? (
        <div className="flex items-center justify-center h-dvh bg-black">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-black mb-4">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-black mb-2">Location Access Required</h2>
              <p className="text-gray-800 mb-6">
                This interactive map application requires access to your location to provide live tracking.
                Please allow location access to start real-time location updates.
              </p>

              <button
                onClick={handleLocationClick}
                className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors font-medium mb-4"
              >
                Try Again
              </button>

              <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded text-black text-sm">
                <strong>Error:</strong> {locationError}
                <div className="mt-2 text-xs">
                  Please check your browser settings and ensure location permissions are enabled for this site.
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <a
                  href="/"
                  className="text-gray-500 hover:text-black transition-colors text-sm"
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
