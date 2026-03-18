/**
 * Push Notification Service
 * Handles browser push notifications for queue alerts
 */

// Check if browser supports notifications
export const isNotificationSupported = () => {
    return 'Notification' in window && 'serviceWorker' in navigator
}

// Get current permission status
export const getNotificationPermission = () => {
    if (!isNotificationSupported()) return 'unsupported'
    return Notification.permission // 'granted', 'denied', or 'default'
}

// Request notification permission
export const requestNotificationPermission = async () => {
    if (!isNotificationSupported()) {
        console.warn('Push notifications not supported in this browser')
        return false
    }

    try {
        const permission = await Notification.requestPermission()
        return permission === 'granted'
    } catch (error) {
        console.error('Error requesting notification permission:', error)
        return false
    }
}

/**
 * Show a notification
 * @param {string} title - Notification title
 * @param {object} options - Notification options
 */
export const showNotification = async (title, options = {}) => {
    if (getNotificationPermission() !== 'granted') {
        console.warn('Notification permission not granted')
        return null
    }

    const defaultOptions = {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        tag: 'minutemax-notification',
        renotify: true,
        requireInteraction: false,
        ...options
    }

    try {
        // Try using service worker for better reliability
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready
            return registration.showNotification(title, defaultOptions)
        } else {
            // Fallback to direct notification
            return new Notification(title, defaultOptions)
        }
    } catch (error) {
        console.error('Error showing notification:', error)
        // Fallback
        return new Notification(title, defaultOptions)
    }
}

/**
 * Show queue alert notification
 * @param {number} position - Current position in queue
 * @param {string} queueType - 'fitting_room' or 'cashier'
 */
export const showQueueAlert = (position, queueType, language = 'en') => {
    const translations = {
        en: {
            title: 'Your Turn is Coming!',
            body: `Only ${position} people ahead of you. Please be ready!`,
            yourTurnTitle: "It's Your Turn!",
            yourTurnBody: `Please proceed to the ${queueType === 'fitting_room' ? 'Fitting Room' : 'Cashier'}`
        },
        si: {
            title: 'ඔබේ වාරය එළඹෙමින්!',
            body: `ඔබට ඉදිරියෙන් ${position} දෙනෙක් පමණයි. කරුණාකර සූදානම් වන්න!`,
            yourTurnTitle: 'ඔබේ වාරයයි!',
            yourTurnBody: `කරුණාකර ${queueType === 'fitting_room' ? 'ඇඳුම් කාමරය' : 'මුදල් අයකැමි'} වෙත යන්න`
        },
        ta: {
            title: 'உங்கள் முறை வருகிறது!',
            body: `உங்களுக்கு முன் ${position} பேர் மட்டுமே. தயவுசெய்து தயாராக இருங்கள்!`,
            yourTurnTitle: 'உங்கள் முறை!',
            yourTurnBody: `தயவுசெய்து ${queueType === 'fitting_room' ? 'ஆடை அறை' : 'காசாளர்'} க்கு செல்லவும்`
        }
    }

    const t = translations[language] || translations.en

    if (position === 0) {
        // It's their turn
        return showNotification(t.yourTurnTitle, {
            body: t.yourTurnBody,
            tag: 'queue-your-turn',
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300]
        })
    } else {
        // Almost their turn
        return showNotification(t.title, {
            body: t.body,
            tag: 'queue-alert'
        })
    }
}

/**
 * Queue notification manager
 * Monitors queue position and triggers alerts
 */
export class QueueNotificationManager {
    constructor() {
        this.alertThreshold = 3 // Alert when X people ahead
        this.lastAlertPosition = null
        this.enabled = false
        this.language = localStorage.getItem('minutemax_language') || 'en'
    }

    enable() {
        this.enabled = true
    }

    disable() {
        this.enabled = false
        this.lastAlertPosition = null
    }

    setLanguage(lang) {
        this.language = lang
    }

    setAlertThreshold(threshold) {
        this.alertThreshold = threshold
    }

    /**
     * Check position and send alert if needed
     * @param {number} position - Current position in queue
     * @param {string} queueType - Queue type
     */
    checkPosition(position, queueType) {
        if (!this.enabled) return

        // Alert when reaching threshold
        if (position <= this.alertThreshold && position > 0) {
            // Only alert once per position
            if (this.lastAlertPosition !== position) {
                this.lastAlertPosition = position
                showQueueAlert(position, queueType, this.language)
            }
        }

        // Special alert when it's their turn
        if (position === 0 && this.lastAlertPosition !== 0) {
            this.lastAlertPosition = 0
            showQueueAlert(0, queueType, this.language)
        }
    }
}

// Singleton instance
export const queueNotificationManager = new QueueNotificationManager()

export default {
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    showNotification,
    showQueueAlert,
    QueueNotificationManager,
    queueNotificationManager
}
