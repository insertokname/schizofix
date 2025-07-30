import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'
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
    </MapContainer>
  )
}
