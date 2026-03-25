import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiBell, FiX, FiCheck, FiClock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { subscribeToNotifications, isNotificationEnabled } from '../services/oneSignalService'
import './NotificationBar.css'

const NotificationBar = () => {
    const [notifications, setNotifications] = useState([])
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifEnabled, setNotifEnabled] = useState(false)
    const [requesting, setRequesting] = useState(false)

    // Load notifications from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('mm_notifications')
        if (stored) {
            const parsed = JSON.parse(stored)
            setNotifications(parsed)
            setUnreadCount(parsed.filter(n => !n.read).length)
        }

        // Check if notifications are enabled
        isNotificationEnabled().then(enabled => setNotifEnabled(enabled))

        // Listen for new notifications (from OneSignal foreground handler)
        const handleNewNotification = (event) => {
            const { title, body, type } = event.detail
            addNotification(title, body, type || 'info')
        }

        window.addEventListener('mm_notification', handleNewNotification)
        return () => window.removeEventListener('mm_notification', handleNewNotification)
    }, [])

    // Save to localStorage whenever notifications change
    useEffect(() => {
        if (notifications.length > 0) {
            localStorage.setItem('mm_notifications', JSON.stringify(notifications.slice(0, 50)))
        }
    }, [notifications])

    const addNotification = (title, body, type = 'info') => {
        const newNotif = {
            id: Date.now(),
            title,
            body,
            type,
            time: new Date().toISOString(),
            read: false
        }
        setNotifications(prev => [newNotif, ...prev].slice(0, 50))
        setUnreadCount(prev => prev + 1)
    }

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
    }

    const markRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const clearAll = () => {
        setNotifications([])
        setUnreadCount(0)
        localStorage.removeItem('mm_notifications')
    }

    const handleEnableNotifications = async () => {
        // Prevent multiple clicks if already requesting
        if (requesting) return;

        setRequesting(true);
        
        try {
            await subscribeToNotifications();
            // Optional: You could add a slight delay here if OneSignal needs a moment to update its state
        } catch (error) {
            console.error("Failed to enable notifications:", error);
            // Optionally add an alert or notification here to inform the user
        } finally {
            // ALWAYS turn off the requesting state, whether it succeeded or failed
            const enabled = await isNotificationEnabled();
            setNotifEnabled(enabled);
            setRequesting(false);
        }
    }

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <FiCheckCircle className="notif-icon success" />
            case 'warning': return <FiAlertCircle className="notif-icon warning" />
            case 'turn': return <FiCheckCircle className="notif-icon turn" />
            default: return <FiClock className="notif-icon info" />
        }
    }

    const getTimeAgo = (isoTime) => {
        const diff = Date.now() - new Date(isoTime).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        return `${Math.floor(hrs / 24)}d ago`
    }

    // Expose addNotification globally so server-sent events can trigger it
    useEffect(() => {
        window.mmAddNotification = addNotification
        return () => { delete window.mmAddNotification }
    }, [])

    return (
        <div className="notification-bar">
            {/* Bell Button */}
            <button
                className="notif-bell-btn"
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAllRead() }}
            >
                <FiBell />
                {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="notif-overlay" onClick={() => setIsOpen(false)} />
                        <motion.div
                            className="notif-panel"
                            initial={{ opacity: 0, y: -10, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                        >
                            {/* Panel Header */}
                            <div className="notif-panel-header">
                                <div className="notif-panel-title">
                                    <FiBell />
                                    <span>Notifications</span>
                                    {unreadCount > 0 && <span className="notif-count-badge">{unreadCount}</span>}
                                </div>
                                <div className="notif-panel-actions">
                                    {notifications.length > 0 && (
                                        <>
                                            <button onClick={markAllRead} className="notif-action-btn">
                                                <FiCheck /> Mark all read
                                            </button>
                                            <button onClick={clearAll} className="notif-action-btn danger">
                                                Clear all
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => setIsOpen(false)} className="notif-close-btn">
                                        <FiX />
                                    </button>
                                </div>
                            </div>

                            {/* Enable notifications prompt */}
                            {!notifEnabled && (
                                <div className="notif-enable-prompt">
                                    <FiBell />
                                    <div>
                                        <p>Enable push notifications to get alerts even when you leave this page.</p>
                                        <button
                                            className="notif-enable-btn"
                                            onClick={handleEnableNotifications}
                                            disabled={requesting}
                                        >
                                            {requesting ? 'Requesting...' : '🔔 Enable Notifications'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Notification List */}
                            <div className="notif-list">
                                {notifications.length === 0 ? (
                                    <div className="notif-empty">
                                        <FiBell />
                                        <p>No notifications yet</p>
                                        <span>Queue updates will appear here</span>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <motion.div
                                            key={notif.id}
                                            className={`notif-item ${!notif.read ? 'unread' : ''} ${notif.type}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={() => markRead(notif.id)}
                                        >
                                            {getIcon(notif.type)}
                                            <div className="notif-content">
                                                <span className="notif-title">{notif.title}</span>
                                                <span className="notif-body">{notif.body}</span>
                                                <span className="notif-time">{getTimeAgo(notif.time)}</span>
                                            </div>
                                            {!notif.read && <div className="notif-unread-dot" />}
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

export default NotificationBar
