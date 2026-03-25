import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiUsers, FiClock, FiCheckCircle, FiAlertCircle, FiHash, FiMapPin, FiBell, FiLoader, FiShoppingCart, FiMaximize2 } from 'react-icons/fi'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import api, { queueService, storeService } from '../services/api'
import { getPlayerId } from '../services/oneSignalService'
import { useAuth } from '../context/AuthContext'
import VisualQueue from '../components/VisualQueue'
import './QueuePage.css'

// Images
import queueIllustration from '../assets/images/queue-illustration.png'
// Queue options
    const queueOptions = [
    {
        type: 'fitting_room',
        name: 'Fitting Room',
        icon: FiUsers,
        description: 'Try on clothes before you buy',
        averageTime: 8,
        color: '#f093fb'
    },
    {
        type: 'checkout',
        name: 'Cashier',
        icon: FiShoppingCart,
        description: 'Ready to complete your purchase',
        averageTime: 3,
        color: '#667eea'
    }
]
window.onerror = function (msg, url, line, col, error) {
  alert("ERROR: " + msg);
};
// Lazy load 3D queue visualization
const QueueVisualization3D = lazy(() => import('../components/3d/QueueVisualization3D'))

// Browser Notification Service
const requestNotificationPermission = async () => {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission()
        return permission === 'granted'
    }
    return false
}

const sendBrowserNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200]
        })
    }
}

const QueuePage = () => {
    const { t } = useTranslation()
    const { isAuthenticated, user } = useAuth()
    const [store, setStore] = useState(null)
    const [queueStatus, setQueueStatus] = useState(null)
    const [selectedQueue, setSelectedQueue] = useState(null)
    const [userQueueStatus, setUserQueueStatus] = useState(null)
    const [notification, setNotification] = useState(null)
    const [loading, setLoading] = useState(true)
    const [checkingStatus, setCheckingStatus] = useState(true)
    const [apiConnected, setApiConnected] = useState(true)
    const [notificationsEnabled, setNotificationsEnabled] = useState(false)
    const [lastNotifiedPosition, setLastNotifiedPosition] = useState(null)
    const [showVisualQueue, setShowVisualQueue] = useState(true)
   

    // Request notification permission on mount
    useEffect(() => {
        requestNotificationPermission().then(granted => {
            setNotificationsEnabled(granted)
        })
    }, [])

    // Check position and send notification when almost their turn
    useEffect(() => {
    if (userQueueStatus) {
        const position = userQueueStatus.position
        if (position <= 3 && position !== lastNotifiedPosition) {
            if (position === 1) {
                sendBrowserNotification('🎉 It\'s Your Turn!', 'Please proceed to the counter now.')
                if (window.mmAddNotification) {
                    window.mmAddNotification(
                        '🎉 It\'s Your Turn!',
                        'Please proceed to the counter now.',
                        'turn'
                    )
                }
            } else if (position <= 3) {
                const msg = `Only ${position - 1} ${position - 1 === 1 ? 'person' : 'people'} ahead of you.`
                sendBrowserNotification('⏰ Almost Your Turn!', msg)
                if (window.mmAddNotification) {
                    window.mmAddNotification(
                        '⏰ Almost Your Turn!',
                        msg,
                        'warning'
                    )
                }
            }
            setLastNotifiedPosition(position)
        }
    }
}, [userQueueStatus, lastNotifiedPosition])

    // Generate QR code URL - use network IP for phone scanning
    const getQrCodeUrl = () => {
        const currentHost = window.location.host
        const protocol = window.location.protocol
        const baseUrl = currentHost.includes('localhost') || currentHost.includes('127.0.0.1')
            ? `${protocol}//192.168.0.100:5173`
            : `${protocol}//${currentHost}`
        return `${baseUrl}/queue`
    }

    

    // Load store and queue status on mount
   useEffect(() => {
  const init = async () => {
    setLoading(true)

    await loadStoreAndQueue()

    if (isAuthenticated) {
      await checkUserQueueStatus()
    } else {
      const guestQueueId = sessionStorage.getItem('guestQueueId')
      const guestToken = sessionStorage.getItem('guestToken')
      const guestQueueType = sessionStorage.getItem('guestQueueType')

      if (guestQueueId && guestToken && guestQueueType) {
        await checkGuestQueueStatus(
          guestQueueId,
          guestToken,
          guestQueueType
        )
      }
    }

    setLoading(false)
  }

  init()
}, [isAuthenticated])

    const loadStoreAndQueue = async () => {
        try {
            // Load single store info
            const storeData = await storeService.getStore()
            setStore(storeData)

            // Load queue status
            const queueData = await queueService.getStatus()
            setQueueStatus(queueData)
            setApiConnected(true)
        } catch (err) {
            console.log('API not available, using mock data')
            setApiConnected(false)
            // Mock store
            setStore({
                id: 1,
                name: 'MinuteMax Fashion Store',
                address: 'No. 123, Main Street, Colombo 03'
            })
            // Mock queue status
            setQueueStatus({
                fitting_room: { count: 4, estimatedWait: 32 },
                cashier: { count: 6, estimatedWait: 18 }
            })
        } finally {
            setLoading(false)
            if (!isAuthenticated) setCheckingStatus(false)
        }
    }

    const checkUserQueueStatus = async () => {
  try {
    const status = await queueService.getMyStatus()

    if (status.inQueue) {
      setUserQueueStatus(status.queue)

      const queueOpt = queueOptions.find(
        q => q.type === status.queue.queue_type
      )

      setSelectedQueue({
        ...queueOpt,
        id: status.queue.id,
        token: status.queue.token,
        peopleInQueue: status.queue.peopleAhead
      })
    }
  } catch (err) {
    console.log('Could not check queue status')
  } finally {
    setCheckingStatus(false) // ⭐ VERY IMPORTANT
  }
}
    // Join queue
    const joinQueue = async (queueType) => {
        try {
            const result = await queueService.join(queueType, 
    sessionStorage.getItem('guestQueueId')  // ← send existing guest queue ID
)
            setApiConnected(true)

            const queueOpt = queueOptions.find(q => q.type === queueType)
            setSelectedQueue({
    ...queueOpt,
    id: result.queue.id,
    token: result.queue.token,
    peopleInQueue: result.queue.peopleAhead
})

            setUserQueueStatus({
                token: result.queue.token,
                position: result.queue.position,
                estimatedWait: result.queue.estimatedWait,
                store_name: store?.name
            })

            setNotification({
                type: 'success',
                message: `You've joined the queue! Token: ${result.queue.token}`
            })

            // Send OneSignal notification + save to notification bar
try {
    const playerId = await getPlayerId()
    if (playerId) {
        sessionStorage.setItem('osPlayerId', playerId)
        await api.post('/notify/queue', {
            playerId,
            title: '✅ Joined Queue',
            message: `Your token is ${result.queue.token}. Position #${result.queue.position}`,
            type: 'success'
        })
    }
    // Also add to in-app notification bar
    if (window.mmAddNotification) {
        window.mmAddNotification(
            '✅ Joined Queue',
            `Your token is ${result.queue.token}. You are #${result.queue.position} in the ${queueType === 'fitting_room' ? 'Fitting Room' : 'Cashier'} queue.`,
            'success'
        )
    }
} catch (err) {
    console.log('Notification error:', err)
}

            

            if (!isAuthenticated) {
    sessionStorage.setItem('guestQueueId', String(result.queue.id))
    sessionStorage.setItem('guestToken', result.queue.token)
    sessionStorage.setItem('guestQueueType', queueType)
}

            // Refresh queue status
            loadStoreAndQueue()
         } catch (err) {
            console.log('Join error:', err.response?.status, err.response?.data)
            if (!apiConnected) {
                // Mock join for demo
                const queueOpt = queueOptions.find(q => q.type === queueType)
                const mockPosition = (queueStatus?.[queueType === 'fitting_room' ? 'fitting_room' : 'cashier']?.count || 0) + 1
                const token = `${queueType === 'fitting_room' ? 'F' : 'C'}${String(mockPosition).padStart(3, '0')}`

                setSelectedQueue({
                    ...queueOpt,
                    id: Date.now(),
                    token: token,
                    peopleInQueue: mockPosition - 1
                })

                setUserQueueStatus({
                    token: token,
                    position: mockPosition,
                    estimatedWait: mockPosition * queueOpt.averageTime,
                    store_name: store?.name || 'MinuteMax Fashion Store'
                })

                setNotification({
                    type: 'success',
                    message: `You've joined the queue! Token: ${token} (Demo mode)`
                })

                // Simulate queue progression in demo mode
                simulateQueueProgress()
            } else if (err.response?.status === 400 && err.response?.data?.currentQueue) {
    // Silently restore queue status instead of showing error
    if (isAuthenticated) {
        await checkUserQueueStatus()
    }
} else {
    setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to join queue'
    })
}
        }
    }

    const simulateQueueProgress = () => {
        const interval = setInterval(() => {
            setUserQueueStatus(prev => {
                if (!prev || prev.position <= 1) {
                    clearInterval(interval)
                    // Send notification when it's their turn
                    setNotification({
                        type: 'alert',
                        message: "🎉 It's your turn! Please proceed to the counter."
                    })
                    sendBrowserNotification("🎉 It's Your Turn!", "Please proceed to the counter now.")
                    return { ...prev, position: 1, estimatedWait: 0 }
                }

                const newPosition = prev.position - 1
                const newWait = Math.max(0, prev.estimatedWait - 3)

                // Send notification when almost their turn (position 2 or 3)
                if (newPosition === 3) {
                    setNotification({
                        type: 'info',
                        message: `⏰ Almost your turn! Only 2 people ahead of you.`
                    })
                    sendBrowserNotification('⏰ Almost Your Turn!', 'Only 2 people ahead of you.')
                } else if (newPosition === 2) {
                    setNotification({
                        type: 'info',
                        message: `⏰ Get ready! Only 1 person ahead of you.`
                    })
                    sendBrowserNotification('⏰ Get Ready!', 'Only 1 person ahead of you.')
                }

                return {
                    ...prev,
                    position: newPosition,
                    estimatedWait: newWait
                }
            })
        }, 8000) // Slower interval for better UX (8 seconds instead of 5)

        // Store interval ID to clean up on unmount
        return interval
    }
const checkGuestQueueStatus = async (queueId, token, queueType) => {
    try {
        const response = await api.get(`/queue/status/${queueId}`)
        if (response.data && response.data.status === 'waiting') {
            const queueOpt = queueOptions.find(q => q.type === queueType)
            setSelectedQueue({
    ...queueOpt,
    id: parseInt(queueId),
    token: token,
    peopleInQueue: response.data.totalInQueue
})
            setUserQueueStatus({
                token: token,
                position: response.data.position,
                estimatedWait: response.data.estimatedWait,
                store_name: store?.name
            })
        } else {
            sessionStorage.removeItem('guestQueueId')
            sessionStorage.removeItem('guestToken')
            sessionStorage.removeItem('guestQueueType')
        }
    } catch (err) {
        console.log('Could not restore guest queue status')
    }
}
const refreshQueue = async () => {
    try {
        const queueData = await queueService.getStatus()
        setQueueStatus(queueData)
        if (isAuthenticated) {
            const status = await queueService.getMyStatus()
            if (status.inQueue) {
                setUserQueueStatus(prev => ({
    ...prev,
    position: status.queue.position,
    estimatedWait: status.queue.estimatedWait
}))
// Trigger in-app notification for position updates
if (window.mmAddNotification) {
    const pos = status.queue.position
    if (pos === 1) {
        window.mmAddNotification('🎉 It\'s Your Turn!', 'Please proceed to the counter now.', 'turn')
    } else if (pos <= 3) {
        window.mmAddNotification('⏰ Almost Your Turn!', `Only ${pos - 1} ${pos - 1 === 1 ? 'person' : 'people'} ahead of you.`, 'warning')
    }
}
setSelectedQueue(prev => ({
    ...prev,
    peopleInQueue: status.queue.totalInQueue
}))
            }
        } else {
            const guestQueueId = sessionStorage.getItem('guestQueueId')
            if (guestQueueId) {
                const response = await api.get(`/queue/status/${guestQueueId}`)
                if (response.data?.status === 'waiting') {
    setUserQueueStatus(prev => ({
        ...prev,
        position: response.data.position,
        estimatedWait: response.data.estimatedWait
    }))
    setSelectedQueue(prev => ({
    ...prev,
    peopleInQueue: response.data.totalInQueue
}))
}
            }
        }
    } catch (err) {
        console.log('Refresh error:', err)
    }
}

    const leaveQueue = async () => {
        const queueId = selectedQueue?.id || sessionStorage.getItem('guestQueueId')
    sessionStorage.removeItem('guestQueueId')
sessionStorage.removeItem('guestToken')
sessionStorage.removeItem('guestQueueType')
        
        try {
            await queueService.leave(queueId)
        } catch (err) {
            console.log('Using mock leave')
        }

        setSelectedQueue(null)
        setUserQueueStatus(null)
        setNotification({
            type: 'info',
            message: 'You have left the queue.'
        })
        loadStoreAndQueue()
    }
const SelectedIcon = selectedQueue?.icon || null
    return (
        <div className="queue-page">
            {/* Background */}
            <div className="queue-bg-gradient" />

            {/* Header */}
            <section className="queue-header">
                <div className="container">
                    <div className="queue-hero-layout">
                        <motion.div
                            className="queue-header-content"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <span className="page-label">Virtual Queue</span>
                            <h1>Skip the Line, <span className="gradient-text">Shop Smart</span></h1>
                            <p>Join our virtual queue and receive real-time updates. Shop freely while you wait!</p>

                            {/* Store Info */}
                            {store && (
                                <div className="store-info-badge">
                                    <FiMapPin />
                                    <span>{store.name} - {store.address}</span>
                                </div>
                            )}

                            {!apiConnected && (
                                <div className="api-status-badge">
                                    <FiAlertCircle /> Demo mode - Start backend for full functionality
                                </div>
                            )}
                        </motion.div>
                        <motion.div
                            className="queue-hero-image"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <img src={queueIllustration} alt="Smart Queue Illustration" />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        className={`notification notification-${notification.type}`}
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                    >
                        <FiBell />
                        <span>{notification.message}</span>
                        <button onClick={() => setNotification(null)}>×</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <section className="queue-content">
                <div className="container">
                    <div className="queue-layout">
                        {/* Queue Selection / Status */}
                        <div className="queue-panel">
                            {loading || checkingStatus ? (
    <div className="loading-state">
                                    <FiLoader className="spinner" />
                                    <p>Loading...</p>
                                </div>
                            ) : !selectedQueue ? (
                                <>
                                    <h2>Select Your Queue</h2>
                                    <p className="queue-instruction">Choose where you'd like to wait</p>

                                    {/* Smart Queue Detection */}
                                    <div className="smart-queue-detect">
                                        <h4>🤖 Quick Selection - What brings you here today?</h4>
                                        <div className="intent-buttons">
                                            <button
                                                className="intent-btn"
                                                onClick={() => joinQueue('fitting_room')}
                                            >
                                                👗 Want to try on clothes
                                            </button>
                                            <button
                                                className="intent-btn"
                                                onClick={() => joinQueue('checkout')}
                                            >
                                                💳 Ready to pay
                                            </button>
                                            <button
                                                className="intent-btn browse"
                                                onClick={() => setNotification({ type: 'info', message: 'Browse freely! Join a queue when you\'re ready.' })}
                                            >
                                                👀 Just browsing
                                            </button>
                                        </div>
                                    </div>

                                    <div className="queue-divider">
                                        <span>or select manually</span>
                                    </div>

                                    <div className="queue-options">
                                        {queueOptions.map((queue, index) => {
                                            const queueData = queueStatus?.[queue.type === 'checkout' ? 'cashier' : queue.type]
                                            return (
                                                <motion.div
                                                    key={queue.type}
                                                    className="queue-option"
                                                    initial={{ opacity: 0, x: -30 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.1 }}
                                                    onClick={() => joinQueue(queue.type)}
                                                    style={{ '--queue-color': queue.color }}
                                                >
                                                    <div className="queue-option-icon">
  {React.createElement(queue.icon)}
</div>
                                                    <div className="queue-option-info">
                                                        <h3>{queue.name}</h3>
                                                        <p className="queue-description">{queue.description}</p>
                                                        <div className="queue-meta">
                                                            <span><FiUsers /> {queueData?.count || 0} waiting</span>
                                                            <span><FiClock /> ~{queueData?.estimatedWait || 0} min</span>
                                                        </div>
                                                    </div>
                                                    <div className="queue-option-action">
                                                        Join →
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </>
                            ) : (
                                <motion.div
                                    className="queue-status"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    <button className="back-btn" onClick={leaveQueue}>← Leave queue</button>
<button className="btn btn-secondary" onClick={refreshQueue} style={{padding: '6px 12px', fontSize: '13px'}}>
    🔄 Refresh
</button>

                                    <div className="status-header">
                                        <div className="status-icon" style={{ background: selectedQueue.color }}>
{SelectedIcon && <SelectedIcon />}
</div>
                                        <div className="status-title">
                                            <h2>{selectedQueue.name}</h2>
                                            <p>{store?.name}</p>
                                        </div>
                                    </div>

                                    {/* Visual Queue Animation Component */}
                                    {showVisualQueue && userQueueStatus && (
                                        <VisualQueue
                                            position={userQueueStatus.position}
                                            totalInQueue={selectedQueue?.peopleInQueue || 9}
                                            estimatedWait={userQueueStatus.estimatedWait || 0}
                                            queueType={selectedQueue?.type}
                                            isYourTurn={userQueueStatus.position === 1}
                                        />
                                    )}

                                    {/* Token Number Display */}
                                    <div className="token-display">
                                        <span className="token-label">Your Token</span>
                                        <span className="token-number">{userQueueStatus?.token}</span>
                                    </div>

                                    <div className="status-cards">
                                        <div className="status-card">
                                            <FiHash />
                                            <div className="status-card-value">{userQueueStatus?.position || 1}</div>
                                            <div className="status-card-label">Position</div>
                                        </div>
                                        <div className="status-card highlight">
                                            <FiClock />
                                            <div className="status-card-value">{userQueueStatus?.estimatedWait || 0}</div>
                                            <div className="status-card-label">Minutes Left</div>
                                        </div>
                                        <div className="status-card">
                                            <FiUsers />
                                            <div className="status-card-value">{(userQueueStatus?.position || 1) - 1}</div>
                                            <div className="status-card-label">Ahead of You</div>
                                        </div>
                                    </div>

                                    {userQueueStatus?.position === 1 && (
                                        <motion.div
                                            className="your-turn-alert"
                                            initial={{ scale: 0.8 }}
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                        >
                                            <FiAlertCircle />
                                            <span>It's Your Turn!</span>
                                        </motion.div>
                                    )}

                                    <button className="btn btn-secondary leave-btn" onClick={leaveQueue}>
                                        Leave Queue
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* 3D Visualization */}
                        <div className="queue-visualization">
                            <div className="visualization-container">
                                <Suspense fallback={<div className="viz-loader">Loading 3D View...</div>}>
                                    <QueueVisualization3D
                                        totalInQueue={selectedQueue?.peopleInQueue || 5}
                                        userPosition={userQueueStatus?.position || 2}
                                        queueType={selectedQueue?.type || 'fitting_room'}
                                        isYourTurn={userQueueStatus?.position === 1}
                                    />
                                </Suspense>
                            </div>
                            <div className="visualization-label">
                                <FiMapPin /> Live Queue Visualization
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* QR Code Section */}
            <section className="qr-section">
                <div className="container">
                    <motion.div
                        className="qr-card"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="qr-content">
                            <h3>Scan to Join Queue Instantly</h3>
                            <p>Use your phone camera to scan and join the queue</p>
                        </div>
                        <div className="qr-code-container">
                            <QRCodeSVG
                                value={getQrCodeUrl()}
                                size={180}
                                bgColor="#ffffff"
                                fgColor="#000000"
                                level="H"
                                includeMargin={true}
                            />
                            <p className="qr-scan-hint">Scan with your phone camera</p>
                            <Link to="/queue/qr" className="qr-fullscreen-btn">
                                <FiMaximize2 />
                                <span>View Full Screen</span>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    )
}

export default QueuePage
