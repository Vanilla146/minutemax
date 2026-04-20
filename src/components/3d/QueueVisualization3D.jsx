import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment, Box, Sphere, RoundedBox, Text, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

// Animated queue person (Modern Soft "Clay" Look)
const QueuePerson = ({ position, index, isServed, isUser, color, scale = 1 }) => {
    const groupRef = useRef()
    const targetX = useRef(position[0])

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Subtle floating animation
            groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + index) * 0.03

            // Move forward in queue animation
            const speed = 3
            groupRef.current.position.x += (targetX.current - groupRef.current.position.x) * delta * speed
        }
    })

    // Softer, modern colors
    const personColor = isServed ? '#10b981' : isUser ? '#d946ef' : color || '#8b5cf6'

    return (
        <Float speed={2} rotationIntensity={0.05} floatIntensity={0.2}>
            <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
                {/* Head */}
                <Sphere args={[0.12, 32, 32]} position={[0, 0.35, 0]}>
                    <meshStandardMaterial
                        color={personColor}
                        roughness={0.7} /* Matte clay finish */
                        metalness={0.1}
                    />
                </Sphere>

                {/* Body */}
                <RoundedBox args={[0.2, 0.35, 0.15]} radius={0.08} position={[0, 0.05, 0]}>
                    <meshStandardMaterial
                        color={personColor}
                        roughness={0.7}
                        metalness={0.1}
                    />
                </RoundedBox>

                {/* Phone in hand */}
                {(index !== 0 || isUser) && (
                    <Box args={[0.06, 0.1, 0.01]} position={[0.12, 0.05, 0.08]} radius={0.02}>
                        <meshStandardMaterial color="#ffffff" emissive={isUser ? '#f093fb' : '#ffffff'} emissiveIntensity={0.8} />
                    </Box>
                )}

                {/* "YOU" label */}
                {isUser && (
                    <Text
                        position={[0, 0.6, 0]}
                        fontSize={0.12}
                        color="#d946ef"
                        fontWeight="bold"
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

// Sleek Modern Service Counter
const ServiceCounter = ({ position, queueType }) => {
    return (
        <group position={position}>
            {/* Main Podium (Sleek White) */}
            <RoundedBox args={[0.7, 0.5, 0.4]} radius={0.05} position={[0, 0.25, 0]}>
                <meshStandardMaterial
                    color="#ffffff"
                    roughness={0.1}
                    metalness={0.1}
                />
            </RoundedBox>

            {/* Glowing Base strip */}
            <Box args={[0.65, 0.02, 0.35]} position={[0, 0.02, 0]}>
                <meshStandardMaterial color={queueType === 'checkout' ? '#667eea' : '#d946ef'} emissive={queueType === 'checkout' ? '#667eea' : '#d946ef'} emissiveIntensity={2} />
            </Box>

            {/* Screen */}
            <RoundedBox args={[0.3, 0.25, 0.02]} radius={0.01} position={[0, 0.6, -0.1]} rotation={[-0.1, 0, 0]}>
                <meshStandardMaterial color="#171717" />
            </RoundedBox>

            {/* Screen Glow */}
            <Box args={[0.26, 0.21, 0.03]} position={[0, 0.6, -0.09]} rotation={[-0.1, 0, 0]}>
                <meshStandardMaterial color={queueType === 'checkout' ? '#818cf8' : '#f093fb'} emissive={queueType === 'checkout' ? '#818cf8' : '#f093fb'} emissiveIntensity={1.5} />
            </Box>

            {/* Queue type label floating above */}
            <Text
                position={[0, 0.9, 0]}
                fontSize={0.09}
                color="#676869"
                fontWeight="bold"
                anchorX="center"
                anchorY="middle"
            >
                {queueType === 'checkout' ? 'CASHIER' : 'FITTING ROOM'}
            </Text>
        </group>
    )
}

// Modern Glowing Floor Track
const QueueLine = ({ peopleCount }) => {
    const width = Math.min(peopleCount, 8) * 0.5 + 1
    const centerX = 0.5 - (width / 2) + 0.5

    return (
        <RoundedBox args={[width, 0.02, 0.3]} radius={0.01} position={[centerX, -0.15, 0]}>
            <meshStandardMaterial color="#f3f4f6" roughness={0.4} />
        </RoundedBox>
    )
}

// Main Queue 3D Visualization
const QueueVisualization3D = ({ 
    totalInQueue = 4, 
    userPosition = 2, 
    queueType = 'fitting_room',
    isYourTurn = false 
}) => {
    
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
                color: queueType === 'checkout' ? '#818cf8' : '#c084fc',
                scale: Math.max(0.85, 1.1 - (displayCount - 3) * 0.04)
            })
        }
        return people
    }, [totalInQueue, userPosition, queueType])

    return (
        <Canvas
            // 👉 CHANGED: Dropped Y to 0.6 and pushed Z all the way in to 3.2!
            camera={{ position: [0, 0.6, 3.2], fov: 40 }} 
            style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
            {/* Softer Lighting Setup */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 8, 2]} intensity={1.5} color="#ffffff" castShadow />
            <pointLight position={[-2, 2, 2]} intensity={0.8} color={queueType === 'checkout' ? '#818cf8' : '#f093fb'} />

            {/* Beautiful Studio Lighting Environment */}
            <Environment preset="city" />

            {/* ✨ THE MAGIC: Contact Shadows to ground the elements ✨ */}
            <ContactShadows 
                position={[0, -0.14, 0]} 
                opacity={0.6} 
                scale={10} 
                blur={2.5} 
                far={4} 
                color="#000000"
            />

            <group position={[0, -0.2, 0]}>
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

                {/* Queue line / pad */}
                <QueueLine peopleCount={totalInQueue} />
            </group>

            {/* Your Turn indicator */}
            {isYourTurn && (
                <Text
                    position={[0, 1.2, 0]}
                    fontSize={0.18}
                    color="#10b981"
                    fontWeight="bold"
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