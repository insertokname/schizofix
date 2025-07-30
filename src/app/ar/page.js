'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { createXRStore, XR } from '@react-three/xr'
import { OrbitControls, Grid } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'

const store = createXRStore()

const randomFloat = (min, max) => Math.random() * (max - min) + min;

function ThrowableSphere({ initialPosition, initialVelocity, id, onDespawn }) {
    const meshRef = useRef()
    const velocityRef = useRef({ ...initialVelocity })
    const [hasDespawned, setHasDespawned] = useState(false)
    const gravity = -9.8 // gravity acceleration

    useFrame((state, delta) => {
        if (meshRef.current && !hasDespawned) {
            // Apply gravity to Y velocity
            velocityRef.current.y += gravity * delta
            
            // Update position based on velocity
            meshRef.current.position.x += velocityRef.current.x * delta
            meshRef.current.position.y += velocityRef.current.y * delta
            meshRef.current.position.z += velocityRef.current.z * delta
            
            // Check if sphere has fallen below y=-100
            if (meshRef.current.position.y < -100) {
                setHasDespawned(true)
                onDespawn(id)
            }
        }
    })

    if (hasDespawned) {
        return null
    }

    return (
        <mesh ref={meshRef} position={[initialPosition.x, initialPosition.y, initialPosition.z]}>
            <sphereGeometry args={[0.1]} />
            <meshStandardMaterial color="red" />
        </mesh>
    )
}

function Face({ initialPosition, speed, id, isARMode = false, faceTexture, onReachPlayer }) {
    const meshRef = useRef()
    const [startPosition] = useState(initialPosition)
    const [hasReachedPlayer, setHasReachedPlayer] = useState(false)

    useFrame((state, delta) => {
        if (meshRef.current && !hasReachedPlayer) {
            const playerPosition = isARMode 
                ? {
                    x: state.camera.position.x,
                    y: state.camera.position.y,
                    z: state.camera.position.z
                }
                : {
                    x: 0,
                    y: 0,
                    z: 0
                }

            meshRef.current.lookAt(playerPosition.x, playerPosition.y, playerPosition.z)

            const directionToPlayer = {
                x: playerPosition.x - meshRef.current.position.x,
                y: playerPosition.y - meshRef.current.position.y,
                z: playerPosition.z - meshRef.current.position.z
            }

            const distanceToPlayer = Math.sqrt(
                directionToPlayer.x ** 2 +
                directionToPlayer.y ** 2 +
                directionToPlayer.z ** 2
            )

            if (distanceToPlayer < 0.5 && !hasReachedPlayer) {
                console.log(`Face ${id} has reached the ${isARMode ? 'camera' : 'origin'}!`)
                setHasReachedPlayer(true)
                onReachPlayer(id)
                return
            }

            if (distanceToPlayer > 0.1) {
                const normalizedDirection = {
                    x: directionToPlayer.x / distanceToPlayer,
                    y: directionToPlayer.y / distanceToPlayer,
                    z: directionToPlayer.z / distanceToPlayer
                }

                meshRef.current.position.x += normalizedDirection.x * speed * delta
                meshRef.current.position.y += normalizedDirection.y * speed * delta
                meshRef.current.position.z += normalizedDirection.z * speed * delta
            }
        }
    })

    if (hasReachedPlayer) {
        return null
    }

    return (
        <mesh ref={meshRef} position={[startPosition.x, startPosition.y, startPosition.z]}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial map={faceTexture} transparent={true} side={THREE.DoubleSide} />
        </mesh>
    )
}

function MultipleFaces({ count, isARMode = false, onCanvasClick }) {
    const [isARSessionActive, setIsARSessionActive] = useState(false)
    const [spheres, setSpheres] = useState([])
    const sphereIdCounter = useRef(0)
    const lastThrowTime = useRef(0)
    const [faces, setFaces] = useState(() => {
        const faceImages = ['/faces/face1.png', '/faces/face2.png']
        
        return Array.from({ length: count }, (_, i) => {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
            const distance = 20
            const height = Math.random() * 4 + 1

            return {
                id: i,
                initialPosition: {
                    x: Math.cos(angle) * distance,
                    y: height,
                    z: Math.sin(angle) * distance
                },
                speed: randomFloat(1.2, 1.5),
                faceImage: faceImages[i % faceImages.length]
            }
        })
    })

    const handleThrowSphere = (cameraPosition, cameraDirection) => {
        const throwForce = 10 // Adjust this to change throw strength
        const sphereId = sphereIdCounter.current++
        
        const newSphere = {
            id: sphereId,
            initialPosition: { ...cameraPosition },
            initialVelocity: {
                x: cameraDirection.x * throwForce,
                y: cameraDirection.y * throwForce + 2, // Add some upward velocity for parabola
                z: cameraDirection.z * throwForce
            }
        }
        
        setSpheres(prev => {
            const updated = [...prev, newSphere]
            console.log('Total spheres:', updated.length)
            return updated
        })
    }

    const handleSphereClick = (camera) => {
        console.log('handleSphereClick called with camera:', camera)
        
        // Ensure we have a valid camera object
        if (!camera || !camera.position || !camera.getWorldDirection) {
            console.error('Invalid camera object passed to handleSphereClick')
            return
        }
        
        // Debounce to prevent double-tapping issues
        const now = Date.now()
        if (now - lastThrowTime.current < 300) { // 300ms debounce
            console.log('Ignoring rapid tap')
            return
        }
        lastThrowTime.current = now
        
        // Get camera direction
        const direction = new THREE.Vector3()
        camera.getWorldDirection(direction)
        
        console.log('Throwing sphere from position:', camera.position)
        console.log('In direction:', direction)
        
        handleThrowSphere(
            {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            },
            {
                x: direction.x,
                y: direction.y,
                z: direction.z
            }
        )
    }

    // Expose the click handler to parent component
    useEffect(() => {
        if (onCanvasClick) {
            // Always set up the handler with a wrapper that will use the current camera
            onCanvasClick.current = (camera) => {
                // If camera is provided, use it; otherwise we'll get it from the current frame
                if (camera) {
                    handleSphereClick(camera)
                } else {
                    console.log('No camera provided to click handler')
                }
            }
        }
    }, []) // Remove onCanvasClick dependency to prevent frequent re-runs

    useFrame((state) => {
        if (isARMode) {
            const isCurrentlyInAR = state.gl.xr && state.gl.xr.isPresenting
            if (isCurrentlyInAR !== isARSessionActive) {
                setIsARSessionActive(isCurrentlyInAR)
            }
        }
        
        // Always ensure the click handler has access to the current camera
        if (onCanvasClick && onCanvasClick.current) {
            // Override with a wrapper that captures the current camera
            onCanvasClick.current = () => {
                console.log('Click handler called with camera:', state.camera)
                handleSphereClick(state.camera)
            }
        }
    })

    // Load textures
    const [textures, setTextures] = useState({})

    useEffect(() => {
        const loader = new THREE.TextureLoader()
        const texturePromises = {}
        
        faces.forEach(face => {
            if (!textures[face.faceImage]) {
                texturePromises[face.faceImage] = new Promise((resolve) => {
                    loader.load(face.faceImage, resolve)
                })
            }
        })

        Promise.all(Object.values(texturePromises)).then((loadedTextures) => {
            const newTextures = {}
            Object.keys(texturePromises).forEach((imagePath, index) => {
                newTextures[imagePath] = loadedTextures[index]
            })
            setTextures(prev => ({ ...prev, ...newTextures }))
        })
    }, [faces])

    const handleFaceReachPlayer = (faceId) => {
        setFaces(prevFaces => prevFaces.filter(face => face.id !== faceId))
    }

    const handleSphereDespawn = (sphereId) => {
        setSpheres(prevSpheres => prevSpheres.filter(sphere => sphere.id !== sphereId))
    }

    if (isARMode && !isARSessionActive) {
        return null
    }

    return (
        <>
            {faces.map(face => (
                textures[face.faceImage] && (
                    <Face
                        key={face.id}
                        id={face.id}
                        initialPosition={face.initialPosition}
                        speed={face.speed}
                        faceTexture={textures[face.faceImage]}
                        isARMode={isARMode}
                        onReachPlayer={handleFaceReachPlayer}
                    />
                )
            ))}
            {spheres.map(sphere => (
                <ThrowableSphere
                    key={sphere.id}
                    id={sphere.id}
                    initialPosition={sphere.initialPosition}
                    initialVelocity={sphere.initialVelocity}
                    onDespawn={handleSphereDespawn}
                />
            ))}
        </>
    )
}

function Fallback3DScene({ onCanvasClick }) {
    return (
        <>
            <MultipleFaces count={20} isARMode={false} onCanvasClick={onCanvasClick} />

            <Grid
                args={[20, 20]}
                position={[0, 0, 0]}
                cellSize={1}
                cellThickness={0.5}
                cellColor="#404040"
                sectionSize={5}
                sectionThickness={1}
                sectionColor="#606060"
                side={2}
            />

            <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.3]} />
                <meshStandardMaterial color="white" />
            </mesh>

            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </>
    )
}

function ARScene({ onCanvasClick, onARStateChange }) {
    const [isARActive, setIsARActive] = useState(false)
    const touchHandlerSetupRef = useRef(false)
    
    useFrame((state) => {
        const isCurrentlyInAR = state.gl.xr && state.gl.xr.isPresenting
        if (isCurrentlyInAR !== isARActive) {
            setIsARActive(isCurrentlyInAR)
            // Notify parent component of AR state change
            if (onARStateChange) {
                onARStateChange(isCurrentlyInAR)
            }
            // Reset touch handler setup flag when AR state changes
            touchHandlerSetupRef.current = false
        }
    })

    // Handle AR touch/tap events with a single, targeted approach
    useEffect(() => {
        if (!isARActive || touchHandlerSetupRef.current) return

        console.log('Setting up AR touch handlers')

        const handleARTouch = (event) => {
            console.log('AR touch detected:', event.type, event.target)
            console.log('Touch event details:', {
                clientX: event.touches?.[0]?.clientX,
                clientY: event.touches?.[0]?.clientY,
                target: event.target.tagName
            })
            event.preventDefault()
            event.stopPropagation()
            
            // Check if handler is available immediately
            if (onCanvasClick && onCanvasClick.current) {
                console.log('Handler available, calling immediately')
                onCanvasClick.current()
            } else {
                console.log('Handler not available immediately, trying with delay')
                // Add a small delay to ensure the handler is properly set
                setTimeout(() => {
                    if (onCanvasClick && onCanvasClick.current) {
                        console.log('Calling sphere throw function after delay')
                        onCanvasClick.current()
                    } else {
                        console.log('onCanvasClick handler still not available after delay')
                        console.log('onCanvasClick:', onCanvasClick)
                        console.log('onCanvasClick.current:', onCanvasClick?.current)
                    }
                }, 10)
            }
        }

        // Use only touchstart on the canvas for AR mode
        const canvas = document.querySelector('canvas')
        
        if (canvas) {
            console.log('Adding touch listener to canvas')
            canvas.addEventListener('touchstart', handleARTouch, { 
                passive: false, 
                capture: true 
            })
            touchHandlerSetupRef.current = true
        } else {
            console.log('Canvas not found for touch handling')
            // Retry after a short delay
            setTimeout(() => {
                const retryCanvas = document.querySelector('canvas')
                if (retryCanvas && !touchHandlerSetupRef.current) {
                    console.log('Retry: Adding touch listener to canvas')
                    retryCanvas.addEventListener('touchstart', handleARTouch, { 
                        passive: false, 
                        capture: true 
                    })
                    touchHandlerSetupRef.current = true
                }
            }, 100)
        }

        // Also add a backup listener to the document for AR mode
        console.log('Adding backup touch listener to document')
        const handleDocumentTouch = (event) => {
            // Only handle if we're in AR and touching the canvas area
            if (event.target.tagName === 'CANVAS') {
                console.log('Backup document touch handler triggered')
                handleARTouch(event)
            }
        }
        
        document.addEventListener('touchstart', handleDocumentTouch, { 
            passive: false, 
            capture: true 
        })

        // Add an even more aggressive global touch handler as a last resort
        const handleGlobalTouch = (event) => {
            console.log('Global touch detected in AR mode, target:', event.target.tagName)
            
            // In AR mode, we want to handle almost any touch that's not on interactive UI elements
            const isInteractiveElement = event.target.tagName === 'BUTTON' || 
                                       event.target.closest('button') ||
                                       event.target.closest('.ar-button-container')
            
            if (!isInteractiveElement) {
                console.log('Global AR touch handler triggered')
                event.preventDefault()
                event.stopPropagation()
                
                if (onCanvasClick && onCanvasClick.current) {
                    console.log('Calling sphere throw from global handler')
                    onCanvasClick.current()
                } else {
                    console.log('onCanvasClick handler not available in global touch')
                }
            } else {
                console.log('Touch on interactive element, ignoring')
            }
        }
        
        // Add to window to catch all touch events
        window.addEventListener('touchstart', handleGlobalTouch, { 
            passive: false, 
            capture: true 
        })

        return () => {
            console.log('Cleaning up AR touch handlers')
            const canvas = document.querySelector('canvas')
            if (canvas) {
                canvas.removeEventListener('touchstart', handleARTouch, { capture: true })
            }
            // Clean up the backup document listener too
            document.removeEventListener('touchstart', handleDocumentTouch, { capture: true })
            // Clean up the global window listener
            window.removeEventListener('touchstart', handleGlobalTouch, { capture: true })
            touchHandlerSetupRef.current = false
        }
    }, [isARActive]) // Remove onCanvasClick dependency

    return (
        <>
            <MultipleFaces count={20} isARMode={true} onCanvasClick={onCanvasClick} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
        </>
    )
}

function SimpleARButton({ isSupported }) {
    const startAR = () => {
        store.enterAR()
    }

    if (!isSupported) {
        return (
            <button className="bg-gray-500 text-white font-bold py-2 px-4 rounded" disabled>
                AR Not Supported - Viewing 3D Scene
            </button>
        )
    }

    return (
        <button
            className="w-full h-full bg-transparent text-white font-bold text-lg flex flex-col items-center justify-center hover:bg-black hover:bg-opacity-20 transition-colors duration-200"
            onClick={startAR}
        >
            <div className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg mb-4 pointer-events-none">
                Tap Anywhere to Start AR
            </div>
            <div className="text-sm opacity-75 text-center max-w-md pointer-events-none">
                Touch the screen to activate AR mode and spawn face sprites around you
            </div>
        </button>
    )
}

export default function ARPage() {
    const [isSupported, setIsSupported] = useState(null)
    const [isARActive, setIsARActive] = useState(false)
    const canvasClickHandlerRef = useRef(null)

    useEffect(() => {
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar').then(setIsSupported)
        } else {
            setIsSupported(false)
        }
    }, [])

    const handleCanvasInteraction = (event) => {
        // Don't handle if we're in AR mode (AR handles its own events)
        if (isARActive) return
        
        // Only handle the event if we're not clicking on the AR button
        if (event.target.closest('.ar-button-container')) {
            return
        }
        
        event.preventDefault()
        event.stopPropagation()
        
        if (canvasClickHandlerRef.current) {
            canvasClickHandlerRef.current()
        }
    }

    if (isSupported === null) {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center">
                <div className="text-white text-center">
                    <p>Checking AR support...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-screen bg-black">
            {isSupported && !isARActive && (
                <div className="absolute inset-0 z-10 ar-button-container">
                    <SimpleARButton isSupported={isSupported} />
                </div>
            )}
            
            {!isSupported && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <SimpleARButton isSupported={isSupported} />
                </div>
            )}

            <div 
                onClick={handleCanvasInteraction} 
                onTouchStart={handleCanvasInteraction}
                style={{ width: '100%', height: '100%' }}
            >
                <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
                    {isSupported ? (
                        <XR store={store}>
                            <ARScene 
                                onCanvasClick={canvasClickHandlerRef} 
                                onARStateChange={setIsARActive}
                            />
                        </XR>
                    ) : (
                        <Fallback3DScene onCanvasClick={canvasClickHandlerRef} />
                    )}
                </Canvas>
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-white text-center z-10 pointer-events-none">
                {isSupported ? (
                    <>
                        {isARActive ? (
                            <>
                                <p className="text-xs mt-1 opacity-75 pointer-events-none">
                                    Tap the screen to throw spheres in AR!
                                </p>
                                <button 
                                    className="bg-red-500 text-white px-4 py-2 rounded mt-2 pointer-events-auto"
                                    onClick={() => {
                                        console.log('Test button clicked')
                                        if (canvasClickHandlerRef.current) {
                                            canvasClickHandlerRef.current()
                                        }
                                    }}
                                >
                                    Test Throw Sphere
                                </button>
                            </>
                        ) : (
                            <p className="text-xs mt-2 opacity-75 pointer-events-none">
                                Make sure to allow camera permissions when prompted
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <p className="text-sm pointer-events-none">
                            AR not supported on this device. Enjoy the 3D scene instead!
                        </p>
                        <p className="text-xs mt-2 opacity-75 pointer-events-none">
                            Drag to rotate • Scroll to zoom • Right-click drag to pan • Click to throw spheres!
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
