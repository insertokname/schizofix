import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocations } from '../providers/LocationsProvider'
import { useGameProgress } from '../providers/GameProgressProvider'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function ChangeView({ center, zoom, shouldCenter = false, onCentered }) {
  const map = useMap()

  useEffect(() => {
    if (shouldCenter) {
      map.setView(center, zoom)
      if (onCentered) {
        onCentered()
      }
    }
  }, [center, zoom, map, shouldCenter, onCentered])

  return null
}

export default function MapComponent({ coordinates, hasUserLocation, initialCenter = false, onCentered }) {
  const position = [coordinates.lat, coordinates.lng]
  const { getLocationsNear, calculateDistance, removeLocation, isLoading, error, getNextBossLocation } = useLocations()
  const { gameProgress } = useGameProgress()
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [bossLocation, setBossLocation] = useState(null)
  const [hasRedirected, setHasRedirected] = useState(false)
  const [accessedLocationIds, setAccessedLocationIds] = useState(new Set())
  const router = useRouter()

  useEffect(() => {
    if (coordinates.lat && coordinates.lng) {
      const isEnemiesAtMax = gameProgress?.defeatedEnemies >= gameProgress?.maxDefeatedEnemies

      if (isEnemiesAtMax) {
        const nextBoss = getNextBossLocation()
        setBossLocation(nextBoss)
        setNearbyPlaces([])
      } else {
        const nearby = getLocationsNear(coordinates.lat, coordinates.lng, 1) // 1km radius
        setNearbyPlaces(prevNearby => {
          if (prevNearby.length === 0) {
            return nearby
          }
          return prevNearby
        })
        setBossLocation(null)
      }
    }
  }, [coordinates.lat, coordinates.lng, getLocationsNear, getNextBossLocation, gameProgress?.defeatedEnemies, gameProgress?.maxDefeatedEnemies])

  useEffect(() => {
    if (coordinates.lat && coordinates.lng && !hasRedirected) {
      const closeDistance = 0.025 // 25 metri

      // Check boss location first
      if (bossLocation) {
        if (accessedLocationIds.has(bossLocation.id)) {
          return
        }

        const distanceToBoss = calculateDistance(
          coordinates.lat,
          coordinates.lng,
          bossLocation.lat,
          bossLocation.lng
        )

        if (distanceToBoss <= closeDistance) {
          setHasRedirected(true)
          setAccessedLocationIds(prev => new Set(prev).add(bossLocation.id))

          setTimeout(() => {
            router.push(`/ar?bossPath=${encodeURIComponent(`/faces/boss${gameProgress.currentBossNumber + 1}.png`)}`)
          }, 1000)
          return
        }
      }

      // Check regular places
      nearbyPlaces.forEach(place => {
        if (accessedLocationIds.has(place.id)) {
          return
        }

        const distanceToPlace = calculateDistance(
          coordinates.lat,
          coordinates.lng,
          place.lat,
          place.lng
        )

        if (distanceToPlace <= closeDistance) {
          setHasRedirected(true)
          setAccessedLocationIds(prev => new Set(prev).add(place.id))
          removeLocation(place.id)

          setTimeout(() => {
            router.push(`/ar?faces=${encodeURIComponent(place.faceImage)}`)
          }, 1000)
        }
      })
    }
  }, [coordinates.lat, coordinates.lng, nearbyPlaces, bossLocation, calculateDistance, removeLocation, router, hasRedirected, accessedLocationIds])

  const capitalizeFirst = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
  }

  const createCustomIcon = (place, distance, isBoss = false) => {
    const closeDistance = 0.025 // 25 metri

    let opacity = 1
    let blur = 0
    let pixelate = 0
    let size = isBoss ? 60 : 40
    let brightness = 1

    if (distance > closeDistance) {
      blur = 2
      pixelate = 8
      size = isBoss ? 70 : 50
    }

    const imageUrl = isBoss ? place.bossImage : place.faceImage
    const borderColor = isBoss ? '#ff0000' : '#fff'

    return new L.DivIcon({
      html: `
        <div style="
          width: ${size}px; 
          height: ${size}px; 
          background-image: url('${imageUrl}'); 
          background-size: cover; 
          background-position: center;
          opacity: ${opacity};
          filter: blur(${blur}px) brightness(${brightness}) contrast(0.8);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          border: 2px solid ${borderColor};
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
          transform: scale(1);
          ${pixelate > 0 ? `
            background-size: ${Math.floor(size / pixelate)}px ${Math.floor(size / pixelate)}px;
            background-repeat: repeat;
          ` : ''}
        "></div>
        ${pixelate > 0 ? `
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: ${size}px;
            height: ${size}px;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.1) 2px,
              rgba(0,0,0,0.1) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.1) 2px,
              rgba(0,0,0,0.1) 4px
            );
            border-radius: 50%;
            pointer-events: none;
          "></div>
        ` : ''}
      `,
      className: isBoss ? 'custom-boss-marker' : 'custom-face-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    })
  }

  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: '100vh', width: '100%' }}
      className="z-0"
    >
      <ChangeView
        center={position}
        zoom={13}
        shouldCenter={initialCenter}
        onCentered={onCentered}
      />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        <Popup>
          <div className="text-center">
            <strong>Your Location</strong>
            <br />
            Lat: {coordinates.lat.toFixed(6)}
            <br />
            Lng: {coordinates.lng.toFixed(6)}
          </div>
        </Popup>
      </Marker>

      {/* Render boss location if available */}
      {bossLocation && (
        <Marker
          key={`boss-${bossLocation.id}`}
          position={[bossLocation.lat, bossLocation.lng]}
          icon={createCustomIcon(bossLocation, calculateDistance(
            coordinates.lat,
            coordinates.lng,
            bossLocation.lat,
            bossLocation.lng
          ), true)}
        >
          <Popup>
            <div className="text-center">
              <div className="mb-2">
                <img
                  src={bossLocation.bossImage}
                  alt="Boss face"
                  className="w-16 h-16 rounded-full mx-auto border-2 border-red-500"
                />
              </div>
              <strong className="text-red-600">BOSS: {bossLocation.name}</strong>
              <br />
              <span className="text-sm text-red-800">
                {capitalizeFirst(bossLocation.type)}
              </span>
              <br />
              <span className="text-xs text-black">
                {(calculateDistance(
                  coordinates.lat,
                  coordinates.lng,
                  bossLocation.lat,
                  bossLocation.lng
                ) * 1000).toFixed(0)}m away
              </span>
              <br />
              <span className="text-xs text-red-600 font-bold">
                Boss Battle Location!
              </span>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Render regular places */}
      {nearbyPlaces.map((place) => {
        const distanceToPlace = calculateDistance(
          coordinates.lat,
          coordinates.lng,
          place.lat,
          place.lng
        )
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={createCustomIcon(place, distanceToPlace, false)}
          >
            <Popup>
              <div className="text-center">
                <div className="mb-2">
                  <img
                    src={place.faceImage}
                    alt="Character face"
                    className="w-16 h-16 rounded-full mx-auto border-2 border-black"
                  />
                </div>
                <strong>{place.name}</strong>
                <br />
                <span className="text-sm text-gray-800">
                  {capitalizeFirst(place.type)}
                </span>
                <br />
                <span className="text-xs text-black">
                  {(distanceToPlace * 1000).toFixed(0)}m away
                </span>
                {place.tags?.cuisine && (
                  <>
                    <br />
                    <span className="text-xs text-gray-600">
                      Cuisine: {place.tags.cuisine}
                    </span>
                  </>
                )}
                {place.tags?.opening_hours && (
                  <>
                    <br />
                    <span className="text-xs text-gray-600">
                      Hours: {place.tags.opening_hours}
                    </span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}

      {isLoading && (
        <div className="absolute top-4 right-4 z-[1000] bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-lg border border-black">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
            <span className="text-sm text-black">Loading places...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 right-4 z-[1000] bg-black bg-opacity-90 text-white px-3 py-2 rounded-lg shadow-lg border border-white">
          <span className="text-sm">Error: {error}</span>
        </div>
      )}
    </MapContainer>
  )
}
