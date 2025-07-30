'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { createXRStore, XR } from '@react-three/xr'
import { OrbitControls, Grid } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useGameProgress } from '../providers/GameProgressProvider'
import * as THREE from 'three'

const store = createXRStore()

const randomFloat = (min, max) => Math.random() * (max - min) + min

function HitEffect({ type, startTime, isARMode }) {
    const meshRef = useRef()
    const [isVisible, setIsVisible] = useState(true)

    useFrame((state) => {
        if (!meshRef.current || !startTime) return

        const elapsed = (Date.now() - startTime) / 1000
        const duration = type === 'red' ? 0.5 : 2.0

        if (elapsed >= duration) {
            setIsVisible(false)
            return
        }

        let opacity = 1
        if (type === 'red') {
            opacity = elapsed <= 0.25 ? elapsed * 4 : (0.5 - elapsed) * 4
        } else {
            const cycle = (elapsed * 4) % 1
            opacity = cycle <= 0.5 ? cycle * 2 : (1 - cycle) * 2
        }

        opacity = Math.max(0, Math.min(1, opacity))
        meshRef.current.material.opacity = opacity * (isARMode ? 0.8 : 0.3)

        // Position relative to camera for consistent visibility
        if (isARMode) {
            const camera = state.camera
            const distance = 1.5
            const forward = new THREE.Vector3(0, 0, -1)
            forward.applyQuaternion(camera.quaternion)

            meshRef.current.position.copy(camera.position)
            meshRef.current.position.add(forward.multiplyScalar(distance))
            meshRef.current.lookAt(camera.position)
        }
    })

    if (!isVisible) return null

    const color = type === 'red' ? '#ff0000' : '#00ff00'
    const size = isARMode ? 3 : 15

    return (
        <mesh ref={meshRef} position={isARMode ? [0, 0, -1.5] : [0, 0, 0]}>
            <planeGeometry args={[size, size]} />
            <meshBasicMaterial
                color={color}
                transparent={true}
                opacity={isARMode ? 0.8 : 0.3}
                side={THREE.DoubleSide}
                depthTest={false}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    )
}

function ThrowableSphere({ initialPosition, initialVelocity, id, onDespawn, faces, onHitFace }) {
    const meshRef = useRef()
    const billboardRef = useRef()
    const velocityRef = useRef({ ...initialVelocity })
    const [hasDespawned, setHasDespawned] = useState(false)
    const [pillTexture, setPillTexture] = useState(null)
    const gravity = -15

    useEffect(() => {
        const loader = new THREE.TextureLoader()
        loader.load('/pill.png', (texture) => {
            setPillTexture(texture)
        })
    }, [])

    useFrame((state, delta) => {
        if (meshRef.current && !hasDespawned) {
            velocityRef.current.y += gravity * delta

            meshRef.current.position.x += velocityRef.current.x * delta
            meshRef.current.position.y += velocityRef.current.y * delta
            meshRef.current.position.z += velocityRef.current.z * delta

            // Update billboard position to match the sphere
            if (billboardRef.current) {
                billboardRef.current.position.copy(meshRef.current.position)
                // Make billboard face the camera
                billboardRef.current.lookAt(state.camera.position)
            }

            if (faces && onHitFace) {
                faces.forEach(face => {
                    const distance = meshRef.current.position.distanceTo(
                        new THREE.Vector3(face.position.x, face.position.y, face.position.z)
                    )

                    if (distance < 1.2) {
                        console.log(`Sphere ${id} hit face ${face.id}! Enemy destroyed!`)
                        onHitFace(face.id)
                        setHasDespawned(true)
                        onDespawn(id)
                    }
                })
            }

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
        <group>
            <mesh ref={meshRef} position={[initialPosition.x, initialPosition.y, initialPosition.z]}>
                <sphereGeometry args={[0.1]} />
                <meshStandardMaterial transparent={true} opacity={0} depthWrite={false} />
            </mesh>

            {pillTexture && (
                <mesh ref={billboardRef} position={[initialPosition.x, initialPosition.y, initialPosition.z]}>
                    <planeGeometry args={[0.3, 0.3]} />
                    <meshBasicMaterial map={pillTexture} transparent={true} side={THREE.DoubleSide} />
                </mesh>
            )}
        </group>
    )
}

function Face({ initialPosition, speed, id, isARMode = false, faceTexture, onReachPlayer, onPositionUpdate, isBoss = false }) {
    const meshRef = useRef()
    const [startPosition] = useState(initialPosition)
    const [hasReachedPlayer, setHasReachedPlayer] = useState(false)
    const spinTimeRef = useRef(0)

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

            // Handle boss spinning behavior
            if (isBoss && initialPosition.isSpinning) {
                const currentTime = Date.now()
                const spinElapsed = currentTime - initialPosition.spinStartTime
                
                if (spinElapsed < initialPosition.spinDuration) {
                    // Spinning phase - orbit around player at fixed distance
                    // Progress from 0 to 1 over the spin duration
                    const progress = spinElapsed / initialPosition.spinDuration
                    // Calculate current angle based on progress and total rotation
                    const angle = progress * initialPosition.totalRotation
                    const distance = initialPosition.spinDistance
                    
                    meshRef.current.position.x = playerPosition.x + Math.cos(angle) * distance
                    meshRef.current.position.y = initialPosition.y
                    meshRef.current.position.z = playerPosition.z + Math.sin(angle) * distance
                } else {
                    // Spinning finished, resume normal approach behavior
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
            } else {
                // Normal enemy behavior
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

            // Update position for collision detection
            if (onPositionUpdate) {
                onPositionUpdate(id, {
                    x: meshRef.current.position.x,
                    y: meshRef.current.position.y,
                    z: meshRef.current.position.z
                })
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

function MultipleFaces({ faceList, bossPath, isARMode = false, onCanvasClick }) {
    const router = useRouter()
    const { gameProgress, incrementDefeatedEnemies, incrementCurrentBossNumber } = useGameProgress()
    const [isARSessionActive, setIsARSessionActive] = useState(false)
    const [spheres, setSpheres] = useState([])
    const sphereIdCounter = useRef(0)
    const lastThrowTime = useRef(0)
    const [facePositions, setFacePositions] = useState({})
    const [hitEffect, setHitEffect] = useState(null)

    const defaultFaceList = [
        '/faces/face1.png',
        '/faces/face2.png',
        '/faces/face3.png',
        '/faces/face4.png',
        '/faces/face5.png',
        '/faces/face6.png',
        '/faces/face7.png',
        '/faces/face8.png'
    ]

    const [faces, setFaces] = useState(() => {
        if (bossPath) {
            const bossAngle = randomFloat(0, Math.PI * 2)
            const bossDistance = randomFloat(10, 15)
            const bossHeight = randomFloat(1, 5)

            return [{
                id: 0,
                initialPosition: {
                    x: Math.cos(bossAngle) * bossDistance,
                    y: bossHeight,
                    z: Math.sin(bossAngle) * bossDistance
                },
                speed: randomFloat(1.5, 1.7),
                faceImage: bossPath,
                lives: 4,
                spawnCount: 0,
                isBoss: true
            }]
        } else {
            let allFaceImages = faceList ? [...faceList] : []
            
            const currentBossNumber = gameProgress?.currentBossNumber || 0
            for (let i = 0; i < currentBossNumber; i++) {
                const randomFaceImage = defaultFaceList[Math.floor(Math.random() * defaultFaceList.length)]
                allFaceImages.push(randomFaceImage)
            }

            return allFaceImages.map((faceImage, i) => {
                const angle = (Math.PI * 2 * i) / allFaceImages.length + randomFloat(0, 0.5)
                const distance = 10
                const height = randomFloat(1, 5)

                return {
                    id: i,
                    initialPosition: {
                        x: Math.cos(angle) * distance,
                        y: height,
                        z: Math.sin(angle) * distance
                    },
                    speed: randomFloat(1.2, 1.5),
                    faceImage: faceImage,
                    lives: 2,
                    spawnCount: 0,
                    isBoss: false
                }
            })
        }
    })

    const generateRandomSpawnPosition = () => {
        const angle = randomFloat(0, Math.PI * 2)
        const distance = randomFloat(15, 25)
        const height = randomFloat(1, 5)

        return {
            x: Math.cos(angle) * distance,
            y: height,
            z: Math.sin(angle) * distance
        }
    }

    const generateBossSpinPosition = (currentPosition) => {
        const distance = Math.sqrt(currentPosition.x ** 2 + currentPosition.z ** 2)
        // Random total rotation between 1 and 2 full rotations (2π to 4π radians)
        const totalRotation = randomFloat(Math.PI * 2, Math.PI * 4)
        
        return {
            x: currentPosition.x,
            y: currentPosition.y, 
            z: currentPosition.z,
            spinDistance: distance,
            isSpinning: true,
            spinStartTime: Date.now(),
            spinDuration: 3000, // 3 seconds of spinning
            totalRotation: totalRotation
        }
    }

    const handleThrowSphere = (cameraPosition, cameraDirection) => {
        const throwForce = 10
        const sphereId = sphereIdCounter.current++

        const newSphere = {
            id: sphereId,
            initialPosition: { ...cameraPosition },
            initialVelocity: {
                x: cameraDirection.x * throwForce,
                y: cameraDirection.y * throwForce + 7,
                z: cameraDirection.z * throwForce
            }
        }

        setSpheres(prev => [...prev, newSphere])
    }

    const handleSphereClick = (camera) => {
        if (!camera || !camera.position || !camera.getWorldDirection) {
            return
        }

        const now = Date.now()
        if (now - lastThrowTime.current < 300) {
            return
        }
        lastThrowTime.current = now

        const direction = new THREE.Vector3()
        camera.getWorldDirection(direction)

        handleThrowSphere(
            {
                x: camera.position.x,
                y: camera.position.y - 1,
                z: camera.position.z
            },
            {
                x: direction.x,
                y: direction.y,
                z: direction.z
            }
        )
    }

    useEffect(() => {
        if (onCanvasClick) {
            onCanvasClick.current = (camera) => {
                if (camera) {
                    handleSphereClick(camera)
                }
            }
        }
    }, [])

    useFrame((state) => {
        if (isARMode) {
            const isCurrentlyInAR = state.gl.xr && state.gl.xr.isPresenting
            if (isCurrentlyInAR !== isARSessionActive) {
                setIsARSessionActive(isCurrentlyInAR)
            }
        }

        if (onCanvasClick && onCanvasClick.current) {
            onCanvasClick.current = () => {
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
        console.log(`Face ${faceId} hit the player! Showing hit effect and reloading...`)

        // Show 3D red hit effect
        setHitEffect({ type: 'red', startTime: Date.now() })

        // Also show DOM overlay for non-AR mode
        if (!isARSessionActive) {
            const hitOverlay = document.createElement('div')
            hitOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
                background: radial-gradient(circle, transparent 60%, rgba(255, 0, 0, 0.8) 100%);
                animation: hitFlash 0.5s ease-out;
            `

            const style = document.createElement('style')
            style.textContent = `
                @keyframes hitFlash {
                    0% { opacity: 0; }
                    50% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `
            document.head.appendChild(style)
            document.body.appendChild(hitOverlay)
        }

        // Remove overlay and reload page after animation
        setTimeout(() => {
            window.location.reload()
        }, 500)
    }

    const handleFacePositionUpdate = (faceId, position) => {
        setFacePositions(prev => ({
            ...prev,
            [faceId]: position
        }))
    }

    const handleFaceHit = (faceId) => {
        const hitFace = faces.find(face => face.id === faceId)

        if (hitFace && hitFace.isBoss) {
            console.log(`BOSS FACE ${faceId} WAS HIT! Boss health: ${hitFace.lives} -> ${hitFace.lives - 1}`)
        } else {
            console.log(`Face ${faceId} was hit! Showing green hit effect...`)
        }

        // Show 3D green hit effect
        setHitEffect({ type: 'green', startTime: Date.now() })

        // Clear the effect after 2 seconds
        setTimeout(() => {
            setHitEffect(null)
        }, 2000)

        // Also show DOM overlay for non-AR mode
        if (!isARSessionActive) {
            const hitOverlay = document.createElement('div')
            hitOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
                background: radial-gradient(circle, transparent 60%, rgba(0, 255, 0, 0.6) 100%);
                animation: greenHitFlash 2s ease-out;
            `

            const style = document.createElement('style')
            style.textContent = `
                @keyframes greenHitFlash {
                    0% { opacity: 0; }
                    25% { opacity: 1; }
                    50% { opacity: 0.5; }
                    75% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `
            document.head.appendChild(style)
            document.body.appendChild(hitOverlay)

            setTimeout(() => {
                if (hitOverlay.parentNode) {
                    hitOverlay.parentNode.removeChild(hitOverlay)
                }
            }, 2000)
        }

        setFaces(prevFaces => {
            const onWon = () => {
                const wasBossLevel = bossPath !== null && bossPath !== undefined
                
                if (wasBossLevel) {
                    incrementCurrentBossNumber(1)
                    console.log(`Boss level completed! Boss number incremented.`)
                } else {
                    incrementDefeatedEnemies(1)
                    console.log(`Normal face level completed! Defeated enemies incremented.`)
                }
                
                router.push('/map');
            };

            const faceIndex = prevFaces.findIndex(face => face.id === faceId)
            if (faceIndex === -1) return prevFaces

            const face = prevFaces[faceIndex]
            const newLives = face.lives - 1

            let facesToReturn = [...prevFaces]
            
            if (face.isBoss) {
                console.log(`BOSS Face ${faceId} was shot! Lives: ${face.lives} -> ${newLives}`)
                
                const newFaceId = Math.max(...prevFaces.map(f => f.id)) + 1
                const randomFaceImage = defaultFaceList[Math.floor(Math.random() * defaultFaceList.length)]
                const spawnPosition = generateRandomSpawnPosition()
                
                const newNormalFace = {
                    id: newFaceId,
                    initialPosition: spawnPosition,
                    speed: randomFloat(1.2, 1.5),
                    faceImage: randomFaceImage,
                    lives: 1,
                    spawnCount: 0,
                    isBoss: false
                }
                
                facesToReturn.push(newNormalFace)
                console.log(`Spawned new normal face ${newFaceId} with 1 HP due to boss hit!`)
            } else {
                console.log(`Face ${faceId} was shot! Lives: ${face.lives} -> ${newLives}`)
            }

            if (newLives <= 0) {
                if (face.isBoss) {
                    console.log(`BOSS Face ${faceId} completely defeated! (no lives left)`)
                } else {
                    console.log(`Face ${faceId} completely despawned (no lives left)`)
                }
                setFacePositions(prev => {
                    const newPositions = { ...prev }
                    delete newPositions[faceId]
                    return newPositions
                })
                const remainingFaces = facesToReturn.filter(f => f.id !== faceId)

                if (remainingFaces.length === 0) {
                    console.log("ALL FACES HAVE BEEN DEFEATED! VICTORY!")

                    // Check if running on Android and in AR session
                    const isAndroid = /Android/i.test(navigator.userAgent)

                    if (isAndroid) {
                        // For Android, try multiple approaches to exit AR
                        try {
                            // Method 1: Try to exit through the store
                            if (store && store.getState && store.getState().gl?.xr?.isPresenting) {
                                const session = store.getState().gl.xr.getSession()
                                if (session) {
                                    session.end().then(() => {
                                        console.log("AR session ended successfully")
                                        setTimeout(() => onWon(), 100)
                                    }).catch((err) => {
                                        console.warn("Session end failed:", err)
                                        onWon()
                                    })
                                } else {
                                    onWon()
                                }
                            }
                            // Method 2: Try through navigator.xr
                            else if (navigator.xr) {
                                navigator.xr.isSessionSupported('immersive-ar').then(supported => {
                                    if (supported) {
                                        // Try to end any active sessions
                                        const endSession = () => {
                                            if (document.exitFullscreen) {
                                                document.exitFullscreen().catch(() => { })
                                            }
                                            onWon()
                                        }
                                        setTimeout(endSession, 100)
                                    } else {
                                        onWon()
                                    }
                                }).catch(() => {
                                    onWon()
                                })
                            } else {
                                onWon()
                            }
                        } catch (error) {
                            console.warn("AR exit failed:", error)
                            onWon()
                        }
                    } else {
                        onWon()
                    }
                }

                return remainingFaces
            }

            if (face.isBoss) {
                console.log(`BOSS Face ${faceId} respawning with ${newLives} lives left`)
            } else {
                console.log(`Face ${faceId} respawning with ${newLives} lives left`)
            }

            facesToReturn[faceIndex] = {
                ...face,
                lives: newLives,
                initialPosition: face.isBoss 
                    ? (newLives === 2 ? generateRandomSpawnPosition() : generateBossSpinPosition(facePositions[faceId] || face.initialPosition))
                    : generateRandomSpawnPosition(),
                speed: face.isBoss ? randomFloat(1.5, 1.7) : randomFloat(1.2, 1.5),
                spawnCount: face.spawnCount + 1,
                isBoss: face.isBoss
            }

            setFacePositions(prev => {
                const newPositions = { ...prev }
                delete newPositions[faceId]
                return newPositions
            })

            return facesToReturn
        })
    }

    const handleSphereDespawn = (sphereId) => {
        setSpheres(prevSpheres => prevSpheres.filter(sphere => sphere.id !== sphereId))
    }

    // Create face data for collision detection
    const facesForCollision = faces.map(face => ({
        id: face.id,
        position: facePositions[face.id] || face.initialPosition
    }))

    if (isARMode && !isARSessionActive) {
        return null
    }

    return (
        <>
            {hitEffect && (
                <HitEffect
                    type={hitEffect.type}
                    startTime={hitEffect.startTime}
                    isARMode={isARMode && isARSessionActive}
                />
            )}
            {faces.map(face => (
                textures[face.faceImage] && (
                    <Face
                        key={`${face.id}-${face.spawnCount}`}
                        id={face.id}
                        initialPosition={face.initialPosition}
                        speed={face.speed}
                        faceTexture={textures[face.faceImage]}
                        isARMode={isARMode}
                        isBoss={face.isBoss}
                        onReachPlayer={handleFaceReachPlayer}
                        onPositionUpdate={handleFacePositionUpdate}
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
                    faces={facesForCollision}
                    onHitFace={handleFaceHit}
                />
            ))}
        </>
    )
}

function Fallback3DScene({ onCanvasClick, faceList, bossPath }) {
    return (
        <>
            <MultipleFaces isARMode={false} onCanvasClick={onCanvasClick} faceList={faceList} bossPath={bossPath} />

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

function ARScene({ onCanvasClick, onARStateChange, faceList, bossPath }) {
    const [isARActive, setIsARActive] = useState(false)
    const touchHandlerSetupRef = useRef(false)

    useFrame((state) => {
        const isCurrentlyInAR = state.gl.xr && state.gl.xr.isPresenting
        if (isCurrentlyInAR !== isARActive) {
            setIsARActive(isCurrentlyInAR)
            if (onARStateChange) {
                onARStateChange(isCurrentlyInAR)
            }
            touchHandlerSetupRef.current = false
        }
    })

    useEffect(() => {
        if (!isARActive || touchHandlerSetupRef.current) return

        const handleARTouch = (event) => {
            event.preventDefault()
            event.stopPropagation()

            if (onCanvasClick && onCanvasClick.current) {
                onCanvasClick.current()
            } else {
                setTimeout(() => {
                    if (onCanvasClick && onCanvasClick.current) {
                        onCanvasClick.current()
                    }
                }, 10)
            }
        }

        const canvas = document.querySelector('canvas')

        if (canvas) {
            canvas.addEventListener('touchstart', handleARTouch, {
                passive: false,
                capture: true
            })
            touchHandlerSetupRef.current = true
        } else {
            setTimeout(() => {
                const retryCanvas = document.querySelector('canvas')
                if (retryCanvas && !touchHandlerSetupRef.current) {
                    retryCanvas.addEventListener('touchstart', handleARTouch, {
                        passive: false,
                        capture: true
                    })
                    touchHandlerSetupRef.current = true
                }
            }, 100)
        }

        const handleDocumentTouch = (event) => {
            if (event.target.tagName === 'CANVAS') {
                handleARTouch(event)
            }
        }

        document.addEventListener('touchstart', handleDocumentTouch, {
            passive: false,
            capture: true
        })

        const handleGlobalTouch = (event) => {
            const isInteractiveElement = event.target.tagName === 'BUTTON' ||
                event.target.closest('button') ||
                event.target.closest('.ar-button-container')

            if (!isInteractiveElement) {
                event.preventDefault()
                event.stopPropagation()

                if (onCanvasClick && onCanvasClick.current) {
                    onCanvasClick.current()
                }
            }
        }

        window.addEventListener('touchstart', handleGlobalTouch, {
            passive: false,
            capture: true
        })

        return () => {
            const canvas = document.querySelector('canvas')
            if (canvas) {
                canvas.removeEventListener('touchstart', handleARTouch, { capture: true })
            }
            document.removeEventListener('touchstart', handleDocumentTouch, { capture: true })
            window.removeEventListener('touchstart', handleGlobalTouch, { capture: true })
            touchHandlerSetupRef.current = false
        }
    }, [isARActive])

    return (
        <>
            <MultipleFaces isARMode={true} onCanvasClick={onCanvasClick} faceList={faceList} bossPath={bossPath} />
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
            <button className="bg-black text-white font-bold py-2 px-4 rounded border border-white" disabled>
                AR Not Supported - Viewing 3D Scene
            </button>
        )
    }

    return (
        <button
            className="w-full h-full bg-transparent text-white font-bold text-lg flex flex-col items-center justify-center hover:bg-black hover:bg-opacity-20 transition-colors duration-200"
            onClick={startAR}
        >
            <div className="bg-black hover:bg-gray-800 text-white font-bold py-4 px-8 rounded-lg mb-4 pointer-events-none border border-white">
                Tap Anywhere to Start AR
            </div>
            <div className="text-sm opacity-75 text-center max-w-md pointer-events-none">
                Touch the screen to activate AR mode and spawn face sprites around you
            </div>
        </button>
    )
}

export default function ARPage() {
    const searchParams = useSearchParams()
    const [isSupported, setIsSupported] = useState(null)
    const [isARActive, setIsARActive] = useState(false)
    const canvasClickHandlerRef = useRef(null)

    const [faceList, setFaceList] = useState(null)
    const [bossPath, setBossPath] = useState(null)

    useEffect(() => {
        const facesParam = searchParams.get('faces')
        const bossParam = searchParams.get('bossPath')

        if (facesParam) {
            const faceImages = facesParam.split(',').map(face => face.trim()).filter(face => face.length > 0)
            setFaceList(faceImages)
        } else {
            setFaceList(null)
        }

        if (bossParam) {
            setBossPath(bossParam.trim())
        } else {
            setBossPath(null)
        }
    }, [searchParams])

    useEffect(() => {
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar').then(setIsSupported)
        } else {
            setIsSupported(false)
        }
    }, [])

    const handleCanvasInteraction = (event) => {
        if (isARActive) return

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
                                faceList={faceList}
                                bossPath={bossPath}
                            />
                        </XR>
                    ) : (
                        <Fallback3DScene
                            onCanvasClick={canvasClickHandlerRef}
                            faceList={faceList}
                            bossPath={bossPath}
                        />
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
                                    className="bg-black text-white px-4 py-2 rounded mt-2 pointer-events-auto border border-white hover:bg-gray-800"
                                    onClick={() => {
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
