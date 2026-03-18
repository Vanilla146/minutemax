import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { FiMaximize2, FiMinimize2, FiArrowLeft, FiSmartphone, FiUsers, FiClock } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import './QueueQRPage.css'

const QueueQRPage = () => {
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showPulse, setShowPulse] = useState(true)

    // Generate QR code URL - use network IP for phone scanning
    const getQrCodeUrl = () => {
        const currentHost = window.location.host
        const protocol = window.location.protocol
        const baseUrl = currentHost.includes('localhost') || currentHost.includes('127.0.0.1')
            ? `${protocol}//192.168.0.100:5173`
            : `${protocol}//${currentHost}`
        return `${baseUrl}/queue`
    }

    // Toggle fullscreen mode
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullscreen(true)
            }).catch(err => {
                console.log('Fullscreen not available:', err)
            })
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false)
            })
        }
    }

    // Handle fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
        }
    }, [])

    // Pulse animation effect
    useEffect(() => {
        const interval = setInterval(() => {
            setShowPulse(prev => !prev)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className={`qr-fullpage ${isFullscreen ? 'is-fullscreen' : ''}`}>
            {/* Background Effects */}
            <div className="qr-bg-gradient" />
            <div className="qr-bg-pattern" />

            {/* Floating Decorations */}
            <div className="floating-decoration dec-1" />
            <div className="floating-decoration dec-2" />
            <div className="floating-decoration dec-3" />

            {/* Header */}
            <header className="qr-header">
                <Link to="/queue" className="back-link">
                    <FiArrowLeft />
                    <span>Back to Queue</span>
                </Link>
                <button
                    className="fullscreen-btn"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                    {isFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
                    <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                </button>
            </header>

            {/* Main Content */}
            <main className="qr-main">
                <motion.div
                    className="qr-content-wrapper"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Title Section */}
                    <div className="qr-title-section">
                        <motion.div
                            className="store-badge"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <FiSmartphone />
                            <span>MinuteMax Queue</span>
                        </motion.div>

                        <h1>
                            <span className="title-line-1">Scan to</span>
                            <span className="title-line-2 gradient-text">Join Queue</span>
                        </h1>

                        <p className="qr-subtitle">
                            Use your phone camera to scan this QR code and skip the line
                        </p>
                    </div>

                    {/* QR Code Container */}
                    <motion.div
                        className="qr-code-wrapper"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    >
                        <div className={`qr-code-frame ${showPulse ? 'pulse' : ''}`}>
                            {/* Corner Decorations */}
                            <div className="corner-decoration top-left" />
                            <div className="corner-decoration top-right" />
                            <div className="corner-decoration bottom-left" />
                            <div className="corner-decoration bottom-right" />

                            {/* QR Code */}
                            <div className="qr-code-inner">
                                <QRCodeSVG
                                    value={getQrCodeUrl()}
                                    size={280}
                                    bgColor="#ffffff"
                                    fgColor="#1a1a2e"
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                        </div>

                        {/* Scan Animation */}
                        <div className="scan-line" />
                    </motion.div>

                    {/* Instructions */}
                    <motion.div
                        className="qr-instructions"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <div className="instruction-step">
                            <div className="step-number">1</div>
                            <span>Open your phone camera</span>
                        </div>
                        <div className="instruction-divider">→</div>
                        <div className="instruction-step">
                            <div className="step-number">2</div>
                            <span>Point at the QR code</span>
                        </div>
                        <div className="instruction-divider">→</div>
                        <div className="instruction-step">
                            <div className="step-number">3</div>
                            <span>Join the virtual queue</span>
                        </div>
                    </motion.div>

                    {/* Features */}
                    <motion.div
                        className="qr-features"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                    >
                        <div className="feature-item">
                            <FiUsers />
                            <span>Skip physical lines</span>
                        </div>
                        <div className="feature-item">
                            <FiClock />
                            <span>Real-time updates</span>
                        </div>
                        <div className="feature-item">
                            <FiSmartphone />
                            <span>Shop while waiting</span>
                        </div>
                    </motion.div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="qr-footer">
                <p>MinuteMax Virtual Queue System</p>
            </footer>
        </div>
    )
}

export default QueueQRPage
