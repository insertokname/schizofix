'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const LocationsContext = createContext()

export function useLocations() {
    const context = useContext(LocationsContext)
    if (!context) {
        throw new Error('useLocations must be used within a LocationsProvider')
    }
    return context
}

const FACE_IMAGES = [
    'face1.png',
    'face2.png',
    'face3.png',
    'face4.png',
    'face5.png',
    'face6.png'
]

const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

const setStoredLocations = (value) => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem('gameLocations', JSON.stringify(value))
            return true
        }
    } catch (error) {
        console.error('Failed to save to localStorage:', error)
        return false
    }
    return false
}

const getStoredLocations = () => {
    try {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('gameLocations')
            if (stored) {
                const parsed = JSON.parse(stored)
                return parsed
            }
        }
    } catch (error) {
        console.error('Error getting stored locations:', error)
    }
    return null
}

const clearStoredLocations = () => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('gameLocations')
        }
    } catch (error) {
        console.error('Failed to clear stored locations:', error)
    }
}

export function LocationsProvider({ children }) {
    const [locations, setLocations] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isInitialized, setIsInitialized] = useState(false)

    const placeTypes = ['pub', 'restaurant', 'cafe', 'supermarket', 'hotel', 'place_of_worship']

    const getRandomFace = () => {
        const randomIndex = Math.floor(Math.random() * FACE_IMAGES.length)
        return `/faces/${FACE_IMAGES[randomIndex]}`
    }

    const fetchLocations = async (lat, lng) => {
        setIsLoading(true)
        setError(null

        )


        try {
            const outerRadius = 2000
            const innerRadius = 100
            const query = `
        [out:json][timeout:25];
        (
          ${placeTypes.map(type =>
                `nwr["amenity"="${type}"](around:${outerRadius},${lat},${lng});`
            ).join('')}
        );
        out geom;
      `

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `data=${encodeURIComponent(query)}`,
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()

            const places = data.elements.map(element => {
                let lat, lng

                if (element.type === 'node') {
                    lat = element.lat
                    lng = element.lon
                } else if (element.type === 'way' && element.geometry) {
                    const coords = element.geometry
                    lat = coords.reduce((sum, point) => sum + point.lat, 0) / coords.length
                    lng = coords.reduce((sum, point) => sum + point.lon, 0) / coords.length
                } else if (element.type === 'relation' && element.members) {
                    const nodeMembers = element.members.filter(m => m.type === 'node' && m.lat && m.lon)
                    if (nodeMembers.length > 0) {
                        lat = nodeMembers.reduce((sum, member) => sum + member.lat, 0) / nodeMembers.length
                        lng = nodeMembers.reduce((sum, member) => sum + member.lon, 0) / nodeMembers.length
                    }
                }

                return {
                    id: element.id,
                    lat,
                    lng,
                    name: element.tags?.name || 'Unnamed',
                    type: element.tags?.amenity || 'unknown',
                    tags: element.tags,
                    faceImage: getRandomFace(),
                    fetchedAt: new Date().toISOString()
                }
            }).filter(place => {
                if (!place.lat || !place.lng) return false
                
                // Calculate distance from user location
                const distance = calculateDistance(lat, lng, place.lat, place.lng) * 1000 // Convert to meters
                
                // Only include places between 100m and 2000m
                return distance >= innerRadius && distance <= outerRadius
            })

            return places
        } catch (error) {
            console.error('Error fetching locations:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const initializeLocations = async (userLat, userLng) => {
        if (isInitialized) return

        setIsLoading(true)
        setError(null)

        try {
            const savedLocations = getStoredLocations()

            if (savedLocations && Array.isArray(savedLocations) && savedLocations.length > 0) {
                setLocations(savedLocations)
            } else {
                const newLocations = await fetchLocations(userLat, userLng)
                setLocations(newLocations)

                setStoredLocations(newLocations)
            }

            setIsInitialized(true)
        } catch (err) {
            setError(err.message)
            console.error('Failed to initialize locations:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const clearSavedLocations = () => {
        clearStoredLocations()
        setLocations([])
        setIsInitialized(false)
    }

    const getLocationsNear = (userLat, userLng, radiusKm = 2) => {
        return locations.filter(location => {
            const distance = calculateDistance(userLat, userLng, location.lat, location.lng)
            return distance <= radiusKm
        })
    }

    const value = {
        locations,
        isLoading,
        error,
        isInitialized,
        initializeLocations,
        clearSavedLocations,
        getLocationsNear,
        calculateDistance
    }

    return (
        <LocationsContext.Provider value={value}>
            {children}
        </LocationsContext.Provider>
    )
}
