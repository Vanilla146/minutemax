import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment, Box, Sphere, RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'

// Animated queue person
const QueuePerson = ({ position, index, isServed, isUser, color, scale = 1 }) => {
    const groupRef = useRef()
    const targetX = useRef(position[0])

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Subtle floating animation
            groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + index) * 0.05

            // Move forward in queue animation
            const speed = 2
            groupRef.current.position.x += (targetX.current - groupRef.current.position.x) * delta * speed
        }
    })

    const personColor = isServed ? '#10b981' : isUser ? '#f093fb' : color || '#667eea'

    return (
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
            <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
                {/* Head */}
                <Sphere args={[0.12, 32, 32]} position={[0, 0.35, 0]}>
                    <meshPhysicalMaterial
                        color={personColor}
                        roughness={0.2}
                        metalness={0.8}
                        clearcoat={1}
                    />
                </Sphere>

                {/* Body */}
                <RoundedBox args={[0.2, 0.35, 0.15]} radius={0.05} position={[0, 0.05, 0]}>
                    <meshPhysicalMaterial
                        color={personColor}
                        roughness={0.3}
                        metalness={0.7}
                    />
                </RoundedBox>

                {/* Phone in hand (if not first or if user) */}
                {(index !== 0 || isUser) && (
                    <Box args={[0.06, 0.1, 0.01]} position={[0.12, 0.05, 0.08]}>
                        <meshStandardMaterial color="#1e293b" emissive={isUser ? '#f093fb' : '#667eea'} emissiveIntensity={0.5} />
                    </Box>
                )}

                {/* "YOU" label above user */}
                {isUser && (
                    <Text
                        position={[0, 0.6, 0]}
                        fontSize={0.1}
                        color="#f093fb"
                        anchorX="center"
                        anchorY="middle"
                    >
                        YOU
                    </Text>
                )}
            </group>
        </Float>
    )
}

// Counter/Service point
const ServiceCounter = ({ position, queueType }) => {
    return (
        <group position={position}>
            {/* Counter */}
            <RoundedBox args={[0.8, 0.5, 0.4]} radius={0.05} position={[0, 0.25, 0]}>
                <meshPhysicalMaterial
                    color="#1e1e3f"
                    roughness={0.2}
                    metalness={0.9}
                />
            </RoundedBox>

            {/* Screen */}
            <Box args={[0.3, 0.25, 0.02]} position={[0, 0.6, -0.1]}>
                <meshStandardMaterial color="#0a0a1a" emissive={queueType === 'checkout' ? '#667eea' : '#f093fb'} emissiveIntensity={0.3} />
            </Box>

            {/* Status light */}
            <Sphere args={[0.04, 16, 16]} position={[0.25, 0.55, 0.2]}>
                <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={2} />
            </Sphere>

            {/* Queue type icon/label */}
            <Text
                position={[0, 0.85, 0]}
                fontSize={0.08}
                color="#fff"
                anchorX="center"
                anchorY="middle"
            >
                {queueType === 'checkout' ? 'CASHIER' : 'FITTING ROOM'}
            </Text>
        </group>
    )
}

// Queue line indicator
const QueueLine = ({ peopleCount }) => {
    const lineRef = useRef()

    useFrame((state) => {
        if (lineRef.current) {
            lineRef.current.material.dashOffset = -state.clock.elapsedTime * 0.5
        }
    })

    const points = []
    const lineLength = Math.min(peopleCount, 8)
    for (let i = 0; i < lineLength + 2; i++) {
        points.push(new THREE.Vector3(-1.5 + i * 0.5, -0.15, 0))
    }
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)

    return (
        <line ref={lineRef} geometry={lineGeometry}>
            <lineDashedMaterial color="#667eea" dashSize={0.1} gapSize={0.05} linewidth={2} />
        </line>
    )
}

// Main Queue 3D Visualization
const QueueVisualization3D = ({ 
    totalInQueue = 4, 
    userPosition = 2, 
    queueType = 'fitting_room',
    isYourTurn = false 
}) => {
    // Generate queue people based on props
    const queuePeople = useMemo(() => {
        const people = []
        const displayCount = Math.min(totalInQueue, 8)
        const spacing = Math.min(0.4, 2.5 / Math.max(displayCount, 1))
        
        for (let i = 0; i < displayCount; i++) {
            const positionIndex = i + 1
            people.push({
                position: [0.5 - (i * spacing), 0, 0],
                index: i,
                isServed: positionIndex < userPosition,
                isUser: positionIndex === userPosition,
                color: queueType === 'checkout' ? '#667eea' : '#764ba2',
                scale: Math.max(0.5, 1 - (displayCount - 3) * 0.08)
            })
        }
        return people
    }, [totalInQueue, userPosition, queueType])

    return (
        <Canvas
            camera={{ position: [0, 0.5, 3], fov: 50 }}
            style={{
                width: '100%',
                height: '100%',
                background: 'transparent'
            }}
        >
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, 5, -5]} intensity={0.5} color="#f093fb" />

            <Environment preset="city" />

            {/* Service Counter */}
            <ServiceCounter position={[1.5, 0, 0]} queueType={queueType} />

            {/* Dynamic Queue people */}
            {queuePeople.map((person, idx) => (
                <QueuePerson
                    key={idx}
                    position={person.position}
                    index={person.index}
                    isServed={person.isServed}
                    isUser={person.isUser}
                    color={person.color}
                    scale={person.scale}
                />
            ))}

            {/* Queue line */}
            <QueueLine peopleCount={totalInQueue} />

            {/* Your Turn indicator */}
            {isYourTurn && (
                <Text
                    position={[0, 1, 0]}
                    fontSize={0.15}
                    color="#10b981"
                    anchorX="center"
                    anchorY="middle"
                >
                    🎉 YOUR TURN!
                </Text>
            )}
        </Canvas>
    )
}

export default QueueVisualization3D
