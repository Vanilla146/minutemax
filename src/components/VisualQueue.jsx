/**
 * Enhanced Visual Queue Animation Component
 * Shows animated queue position with walking animations and celebration effects
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { FiUser, FiCheck, FiClock } from 'react-icons/fi'
import './VisualQueue.css'

// Confetti particle component
const ConfettiParticle = ({ delay, x, y, rotation, color }) => (
    <motion.div
        className="confetti-particle"
        initial={{
            opacity: 1,
            x: 0,
            y: 0,
            rotate: 0,
            scale: 1
        }}
        animate={{
            opacity: [1, 1, 0],
            x: x,
            y: y,
            rotate: rotation,
            scale: [1, 1.2, 0.5]
        }}
        transition={{
            duration: 2,
            delay: delay,
            ease: "easeOut"
        }}
        style={{
            background: color,
            position: 'absolute',
            width: '10px',
            height: '10px',
            borderRadius: Math.random() > 0.5 ? '50%' : '2px'
        }}
    />
)

const VisualQueue = ({
    position = 5,
    totalInQueue = 10,
    estimatedWait = 15,
    queueType = 'fitting_room',
    isYourTurn = false
}) => {
    const { t } = useTranslation()
    const [showConfetti, setShowConfetti] = useState(false)
    const [animationKey, setAnimationKey] = useState(0)

    // Trigger confetti when it's your turn
    useEffect(() => {
        if (isYourTurn) {
            setShowConfetti(true)
            setAnimationKey(prev => prev + 1)
        } else {
            setShowConfetti(false)
        }
    }, [isYourTurn])

    // Generate confetti particles
    const confettiColors = ['#f093fb', '#f5576c', '#fbbf24', '#34d399', '#667eea', '#764ba2']
    const confettiParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 300,
        y: -(Math.random() * 200 + 100),
        rotation: Math.random() * 720 - 360,
        delay: Math.random() * 0.5,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)]
    }))

    // Generate queue people array
    const queuePeople = Array.from({ length: Math.min(totalInQueue, 10) }, (_, i) => ({
        id: i + 1,
        isYou: i + 1 === position,
        isServed: i + 1 < position,
        isAhead: i + 1 > position
    }))

    const progressPercentage = ((totalInQueue - position + 1) / totalInQueue) * 100

    // Walking animation for people waiting
    const walkingVariants = {
        idle: {
            y: 0,
        },
        walking: {
            y: [0, -6, 0],
            transition: {
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    }

    // Person entry animation
    const personVariants = {
        initial: {
            opacity: 0,
            y: 30,
            scale: 0.5,
            rotate: -10
        },
        animate: (custom) => ({
            opacity: 1,
            y: 0,
            scale: 1,
            rotate: 0,
            x: custom.isServed ? -60 : 0,
            transition: {
                delay: custom.index * 0.08,
                duration: 0.5,
                type: "spring",
                stiffness: 260,
                damping: 20
            }
        }),
        exit: {
            opacity: 0,
            x: -100,
            scale: 0.5,
            transition: { duration: 0.3 }
        },
        served: {
            x: -60,
            opacity: 0.4,
            transition: {
                duration: 0.8,
                ease: "easeInOut"
            }
        }
    }

    return (
        <div className="visual-queue">
            {/* Confetti Container */}
            <AnimatePresence>
                {showConfetti && (
                    <div className="confetti-container" key={animationKey}>
                        {confettiParticles.map(particle => (
                            <ConfettiParticle
                                key={particle.id}
                                x={particle.x}
                                y={particle.y}
                                rotation={particle.rotation}
                                delay={particle.delay}
                                color={particle.color}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Queue Header */}
            <div className="queue-header">
                <h3>
                    {isYourTurn ? (
                        <motion.span
                            className="your-turn-text"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        >
                            🎉 {t('queue.yourTurn', "It's Your Turn!")}
                        </motion.span>
                    ) : (
                        <>
                            {t('queue.yourPosition', 'Your Position')}: <span className="position-number">#{position}</span>
                        </>
                    )}
                </h3>
                <motion.div
                    className="wait-time"
                    animate={estimatedWait <= 5 ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                >
                    <FiClock />
                    <span>{estimatedWait} {t('queue.minutes', 'min')}</span>
                </motion.div>
            </div>

            {/* Progress Bar */}
            <div className="queue-progress">
                <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                >
                    <motion.div
                        className="progress-glow"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </motion.div>
                <div className="progress-markers">
                    {[0, 25, 50, 75, 100].map(mark => (
                        <motion.div
                            key={mark}
                            className={`marker ${progressPercentage >= mark ? 'passed' : ''}`}
                            animate={progressPercentage >= mark ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ duration: 0.3 }}
                        />
                    ))}
                </div>
            </div>

            
            {/* Queue Stats */}
            <div className="queue-stats">
                <motion.div
                    className="stat"
                    whileHover={{ scale: 1.05 }}
                >
                    <span className="stat-value">{position - 1}</span>
                    <span className="stat-label">{t('queue.peopleAhead', 'People Ahead')}</span>
                </motion.div>
                <motion.div
                    className="stat"
                    whileHover={{ scale: 1.05 }}
                >
                    <span className="stat-value">{totalInQueue}</span>
                    <span className="stat-label">{t('queue.totalQueue', 'Total in Queue')}</span>
                </motion.div>
                <motion.div
                    className="stat"
                    whileHover={{ scale: 1.05 }}
                >
                    <span className="stat-value">~{Math.ceil(estimatedWait / position) || 3}</span>
                    <span className="stat-label">{t('queue.minPerson', 'Min per person')}</span>
                </motion.div>
            </div>

            {/* Your Turn Overlay */}
            <AnimatePresence>
                {isYourTurn && (
                    <motion.div
                        className="your-turn-overlay"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    >
                        {/* Background Pulse Rings */}
                        <div className="pulse-rings">
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="pulse-ring"
                                    initial={{ scale: 0.5, opacity: 0.8 }}
                                    animate={{ scale: 2.5, opacity: 0 }}
                                    transition={{
                                        duration: 2,
                                        delay: i * 0.5,
                                        repeat: Infinity,
                                        ease: "easeOut"
                                    }}
                                />
                            ))}
                        </div>

                        <motion.div
                            className="celebration"
                            animate={{
                                rotate: [0, 15, -15, 0],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                        >
                            🎉
                        </motion.div>
                        <motion.h2
                            initial={{ y: 20 }}
                            animate={{ y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            {t('queue.yourTurn', "It's Your Turn!")}
                        </motion.h2>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            {t('queue.pleaseHead', 'Please proceed to')} {queueType === 'fitting_room' ? t('queue.fittingRoom', 'the fitting room') : t('queue.cashier', 'the cashier')}
                        </motion.p>

                        {/* Floating Stars */}
                        <div className="floating-stars">
                            {['⭐', '✨', '💫', '⭐', '✨'].map((star, i) => (
                                <motion.span
                                    key={i}
                                    className="floating-star"
                                    initial={{ y: 0, opacity: 0 }}
                                    animate={{
                                        y: -50 - Math.random() * 50,
                                        x: (Math.random() - 0.5) * 100,
                                        opacity: [0, 1, 0]
                                    }}
                                    transition={{
                                        duration: 2,
                                        delay: i * 0.3,
                                        repeat: Infinity,
                                        repeatDelay: 1
                                    }}
                                    style={{
                                        position: 'absolute',
                                        fontSize: '1.5rem'
                                    }}
                                >
                                    {star}
                                </motion.span>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default VisualQueue
