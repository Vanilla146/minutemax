import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, Box, Torus, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'

// Animated floating sphere
const FloatingSphere = ({ position, color, size = 1, speed = 1 }) => {
    const meshRef = useRef()

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.2 * speed
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.3 * speed
        }
    })

    return (
        <Float speed={speed} rotationIntensity={0.5} floatIntensity={2}>
            <Sphere ref={meshRef} args={[size, 64, 64]} position={position}>
                <MeshDistortMaterial
                    color={color}
                    attach="material"
                    distort={0.4}
                    speed={2}
                    roughness={0.2}
                    metalness={0.8}
                />
            </Sphere>
        </Float>
    )
}

// Animated torus ring
const FloatingTorus = ({ position, color, size = 1 }) => {
    const meshRef = useRef()

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.5
            meshRef.current.rotation.z = state.clock.elapsedTime * 0.3
        }
    })

    return (
        <Float speed={1.5} rotationIntensity={1} floatIntensity={1.5}>
            <Torus ref={meshRef} args={[size, size * 0.3, 16, 32]} position={position}>
                <meshStandardMaterial
                    color={color}
                    roughness={0.3}
                    metalness={0.9}
                    transparent
                    opacity={0.8}
                />
            </Torus>
        </Float>
    )
}

// Animated shopping bag
const ShoppingBag = ({ position }) => {
    const groupRef = useRef()

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
            groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 0.2
        }
    })

    return (
        <Float speed={1} rotationIntensity={0.3} floatIntensity={1}>
            <group ref={groupRef} position={position}>
                {/* Bag body */}
                <Box args={[1, 1.2, 0.6]} position={[0, 0, 0]}>
                    <meshStandardMaterial color="#667eea" roughness={0.3} metalness={0.6} />
                </Box>
                {/* Handle */}
                <Torus args={[0.25, 0.05, 8, 16]} position={[0, 0.8, 0]} rotation={[0, 0, 0]}>
                    <meshStandardMaterial color="#764ba2" roughness={0.4} metalness={0.8} />
                </Torus>
            </group>
        </Float>
    )
}

// Particle field for background
const ParticleField = () => {
    const count = 500
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3)
        for (let i = 0; i < count * 3; i += 3) {
            pos[i] = (Math.random() - 0.5) * 30
            pos[i + 1] = (Math.random() - 0.5) * 30
            pos[i + 2] = (Math.random() - 0.5) * 30
        }
        return pos
    }, [])

    const pointsRef = useRef()

    useFrame((state) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y = state.clock.elapsedTime * 0.03
            pointsRef.current.rotation.x = state.clock.elapsedTime * 0.02
        }
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                color="#667eea"
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    )
}

// Queue visualization - 3D representation of people in queue
const QueueVisualization = ({ position }) => {
    const groupRef = useRef()

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 0.3) * 0.5
        }
    })

    return (
        <group ref={groupRef} position={position}>
            {[0, 1, 2, 3].map((i) => (
                <Float key={i} speed={1 + i * 0.2} floatIntensity={0.5}>
                    <group position={[i * 0.8, 0, 0]}>
                        {/* Person head */}
                        <Sphere args={[0.15, 16, 16]} position={[0, 0.5, 0]}>
                            <meshStandardMaterial
                                color={i === 0 ? '#10b981' : '#667eea'}
                                roughness={0.3}
                                metalness={0.6}
                            />
                        </Sphere>
                        {/* Person body */}
                        <Box args={[0.3, 0.5, 0.2]} position={[0, 0.1, 0]}>
                            <meshStandardMaterial
                                color={i === 0 ? '#059669' : '#5a67d8'}
                                roughness={0.3}
                                metalness={0.6}
                            />
                        </Box>
                    </group>
                </Float>
            ))}
        </group>
    )
}

// Main 3D Scene Component
const ShoppingScene = () => {
    return (
        <Canvas
            camera={{ position: [0, 0, 8], fov: 60 }}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
            }}
        >
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
            <pointLight position={[-10, -10, -5]} intensity={0.5} color="#667eea" />
            <pointLight position={[10, -10, 5]} intensity={0.5} color="#f093fb" />

            {/* Background */}
            <Stars radius={100} depth={50} count={1000} factor={4} fade speed={1} />
            <ParticleField />

            {/* Main Elements */}
            <FloatingSphere position={[3, 1, -2]} color="#667eea" size={0.8} speed={1.2} />
            <FloatingSphere position={[-3.5, -1, -1]} color="#f093fb" size={0.6} speed={0.8} />
            <FloatingSphere position={[4, -2, 0]} color="#10b981" size={0.5} speed={1} />

            <FloatingTorus position={[-4, 2, -3]} color="#764ba2" size={0.7} />
            <FloatingTorus position={[2, -1.5, -2]} color="#f5576c" size={0.5} />

            <ShoppingBag position={[-2, 0, 0]} />
            <QueueVisualization position={[1, -0.5, 1]} />

            {/* Subtle orbit controls for interactivity */}
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                maxPolarAngle={Math.PI / 2}
                minPolarAngle={Math.PI / 2}
                autoRotate
                autoRotateSpeed={0.5}
            />
        </Canvas>
    )
}

export default ShoppingScene
