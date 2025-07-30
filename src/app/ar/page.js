'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { createXRStore, XR } from '@react-three/xr'
import { OrbitControls, Grid } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'

const store = createXRStore()

function SpinningCube() {
    const meshRef = useRef()

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += 0.01
            meshRef.current.rotation.y += 0.01

            const time = state.clock.getElapsedTime()
            const radius = 5
            meshRef.current.position.x = Math.cos(time * 0.5) * radius
            meshRef.current.position.y = 15
            meshRef.current.position.z = Math.sin(time * 0.5) * radius
        }
    })

    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="hotpink" />
        </mesh>
    )
}

function Fallback3DScene() {
    return (
        <>
            <SpinningCube />

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

function ARScene() {
    return (
        <>
            <SpinningCube />
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
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={startAR}
        >
            Start AR
        </button>
    )
}

export default function ARPage() {
    const [isSupported, setIsSupported] = useState(null) // null = checking, false = not supported, true = supported

    useEffect(() => {
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar').then(setIsSupported)
        } else {
            setIsSupported(false)
        }
    }, [])

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
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                <SimpleARButton isSupported={isSupported} />
            </div>

            <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
                {isSupported ? (
                    <XR store={store}>
                        <ARScene />
                    </XR>
                ) : (
                    <Fallback3DScene />
                )}
            </Canvas>

            <div className="absolute bottom-4 left-4 right-4 text-white text-center z-10">
                {isSupported ? (
                    <>
                        <p className="text-sm">
                            Tap "Start AR" to view through your camera. You should see a pink cube in AR space.
                        </p>
                        <p className="text-xs mt-2 opacity-75">
                            Make sure to allow camera permissions when prompted
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-sm">
                            AR not supported on this device. Enjoy the 3D scene instead!
                        </p>
                        <p className="text-xs mt-2 opacity-75">
                            Drag to rotate • Scroll to zoom • Right-click drag to pan
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
