// ========================
// OneSignal Service
// Handles push notification subscription and management
// ========================

const ONESIGNAL_APP_ID = '65971a38-cb02-47fe-a5c3-12e53a13ecb1'

// Initialize OneSignal
export const initOneSignal = async () => {
    try {
        // Add a safety check for the window object
        if (typeof window !== "undefined" && window.OneSignalDeferred) {
            window.OneSignalDeferred.push(async (OneSignal) => {
                await OneSignal.init({
                    appId: ONESIGNAL_APP_ID,
                    safari_web_id: '',
                    notifyButton: { enable: false },
                    allowLocalhostAsSecureOrigin: true,
                    promptOptions: {
                        slidedown: {
                            enabled: true,
                            actionMessage: "MinuteMax would like to send you queue notifications",
                            acceptButtonText: "Allow",
                            cancelButtonText: "No Thanks",
                        }
                    }
                });
            });
            console.log('✅ OneSignal initialized');
        }
    } catch (err) {
        console.error('❌ OneSignal init error:', err);
    }
}

// Request notification permission and subscribe
export const subscribeToNotifications = async () => {
    try {
        await window.OneSignalDeferred.push(async (OneSignal) => {
            // 1. If the browser already said yes, just force OneSignal to sync!
            if (Notification.permission === 'granted') {
                await OneSignal.User.PushSubscription.optIn();
                return; // Stop here, no need for a popup
            }
            
            // 2. Otherwise, show the normal prompt
            await OneSignal.Slidedown.promptPush({ force: true });
        });
    } catch (err) {
        console.error('Subscribe error:', err);
    }
}

// Get the OneSignal player/subscription ID
export const getPlayerId = async () => {
    try {
        return new Promise((resolve) => {
            window.OneSignalDeferred.push(async (OneSignal) => {
                const id = await OneSignal.User.PushSubscription.id
                resolve(id)
            })
        })
    } catch (err) {
        console.error('Get player ID error:', err)
        return null
    }
}

// Set external user ID (for registered users)
export const setExternalUserId = async (userId) => {
    try {
        await window.OneSignalDeferred.push(async (OneSignal) => {
            await OneSignal.login(String(userId))
            console.log('✅ OneSignal external user ID set:', userId)
        })
    } catch (err) {
        console.error('Set external user ID error:', err)
    }
}

// Remove external user ID (on logout)
export const removeExternalUserId = async () => {
    try {
        await window.OneSignalDeferred.push(async (OneSignal) => {
            await OneSignal.logout()
            console.log('✅ OneSignal user logged out')
        })
    } catch (err) {
        console.error('Remove external user ID error:', err)
    }
}

// Check if notifications are enabled
export const isNotificationEnabled = async () => {
    try {
        return new Promise((resolve) => {
            window.OneSignalDeferred.push(async (OneSignal) => {
                const enabled = await OneSignal.User.PushSubscription.optedIn
                resolve(enabled)
            })
        })
    } catch (err) {
        return false
    }
}

export { ONESIGNAL_APP_ID }
