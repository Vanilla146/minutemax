/**
 * Enhanced AR Overlay Component with Real-Time Pose Detection
 * Full virtual try-on with clothing overlay on selfie using TensorFlow.js BlazePose
 * Features: Webcam capture, image upload, pose detection, auto-positioning, drag/resize, rotation
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FiCamera, FiX, FiRefreshCw, FiDownload, FiShare2,
    FiZoomIn, FiZoomOut, FiMove, FiRotateCw, FiSliders,
    FiImage, FiCpu, FiTarget, FiEye
} from 'react-icons/fi'
import * as poseDetection from '@tensorflow-models/pose-detection'
import '@tensorflow/tfjs-backend-webgl'
import './AROverlay.css'

const AROverlay = ({
    productImage,
    productName,
    productCategory = 'tops',
    onClose,
    isOpen = false
}) => {
    const [userImage, setUserImage] = useState(null)
    const [overlayPosition, setOverlayPosition] = useState({ x: 50, y: 35 })
    const [overlayScale, setOverlayScale] = useState(1)
    const [overlayRotation, setOverlayRotation] = useState(0)
    const [overlayOpacity, setOverlayOpacity] = useState(0.95)
    const [isDragging, setIsDragging] = useState(false)
    const [isWebcamActive, setIsWebcamActive] = useState(false)
    const [showControls, setShowControls] = useState(true)
    const [isMirrored] = useState(true)

    // Pose Detection States
    const [poseDetector, setPoseDetector] = useState(null)
    const [isPoseLoading, setIsPoseLoading] = useState(false)
    const [detectionStatus, setDetectionStatus] = useState('idle') // idle, loading, detecting, detected, not-found
    const [autoPosition, setAutoPosition] = useState(true)
    const [bodyPose, setBodyPose] = useState(null)
    const [showDebugSkeleton, setShowDebugSkeleton] = useState(false)

    const containerRef = useRef(null)
    const fileInputRef = useRef(null)
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const detectionLoopRef = useRef(null)
    const canvasRef = useRef(null)

    // Default position based on product category
    useEffect(() => {
        if (productCategory && isOpen) {
            const positions = {
                tops: { x: 50, y: 38, scale: 0.9 },
                bottoms: { x: 50, y: 68, scale: 0.75 },
                shoes: { x: 50, y: 88, scale: 0.5 },
                accessories: { x: 50, y: 22, scale: 0.4 }
            }
            const pos = positions[productCategory] || positions.tops
            setOverlayPosition({ x: pos.x, y: pos.y })
            setOverlayScale(pos.scale)
        }
    }, [productCategory, isOpen])

    // Initialize Pose Detector
    useEffect(() => {
        if (isOpen && !poseDetector) {
            initializePoseDetector()
        }
        return () => {
            if (detectionLoopRef.current) {
                cancelAnimationFrame(detectionLoopRef.current)
            }
        }
    }, [isOpen])

    const initializePoseDetector = async () => {
        try {
            setIsPoseLoading(true)
            setDetectionStatus('loading')

            // Use BlazePose for full body detection
            const detector = await poseDetection.createDetector(
                poseDetection.SupportedModels.BlazePose,
                {
                    runtime: 'tfjs',
                    modelType: 'lite', // 'lite' for faster performance, 'full' for accuracy
                    enableSmoothing: true
                }
            )

            setPoseDetector(detector)
            setIsPoseLoading(false)
            setDetectionStatus('idle')
            console.log('✅ BlazePose detector ready')
        } catch (err) {
            console.error('❌ Failed to initialize pose detector:', err)
            setIsPoseLoading(false)
            setDetectionStatus('idle')
            setAutoPosition(false)
        }
    }

    // Run pose detection loop when webcam is active
    useEffect(() => {
        if (isWebcamActive && poseDetector && autoPosition) {
            startPoseDetection()
        } else {
            stopPoseDetection()
        }

        return () => stopPoseDetection()
    }, [isWebcamActive, poseDetector, autoPosition])

    const startPoseDetection = () => {
        if (!poseDetector || !videoRef.current) return

        setDetectionStatus('detecting')

        const detect = async () => {
            if (!isWebcamActive || !autoPosition) {
                setDetectionStatus('idle')
                return
            }

            try {
                const video = videoRef.current
                if (video && video.readyState >= 2) {
                    const poses = await poseDetector.estimatePoses(video, {
                        flipHorizontal: isMirrored
                    })

                    if (poses.length > 0 && poses[0].keypoints) {
                        setBodyPose(poses[0])
                        setDetectionStatus('detected')
                        updateOverlayFromPose(poses[0].keypoints, video.videoWidth, video.videoHeight)
                    } else {
                        setDetectionStatus('not-found')
                        setBodyPose(null)
                    }
                }
            } catch (err) {
                console.warn('Pose detection error:', err)
            }

            detectionLoopRef.current = requestAnimationFrame(detect)
        }

        detect()
    }

    const stopPoseDetection = () => {
        if (detectionLoopRef.current) {
            cancelAnimationFrame(detectionLoopRef.current)
            detectionLoopRef.current = null
        }
        setBodyPose(null)
    }

    // Calculate overlay position from pose keypoints
    const updateOverlayFromPose = (keypoints, videoWidth, videoHeight) => {
        // BlazePose keypoint indices
        const keypointMap = {}
        keypoints.forEach(kp => {
            keypointMap[kp.name] = kp
        })

        const leftShoulder = keypointMap['left_shoulder']
        const rightShoulder = keypointMap['right_shoulder']
        const leftHip = keypointMap['left_hip']
        const rightHip = keypointMap['right_hip']
        const nose = keypointMap['nose']

        // Check confidence thresholds
        const minConfidence = 0.5

        if (productCategory === 'tops' || productCategory === 'all') {
            // Position for tops: center between shoulders
            if (leftShoulder?.score > minConfidence && rightShoulder?.score > minConfidence) {
                const centerX = (leftShoulder.x + rightShoulder.x) / 2
                const centerY = (leftShoulder.y + rightShoulder.y) / 2 + 80 // Offset below shoulders

                // Calculate shoulder width for scaling
                const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x)
                const newScale = Math.max(0.5, Math.min(1.5, (shoulderWidth / videoWidth) * 3.5))

                setOverlayPosition({
                    x: (centerX / videoWidth) * 100,
                    y: (centerY / videoHeight) * 100
                })
                setOverlayScale(newScale)
            }
        } else if (productCategory === 'bottoms') {
            // Position for bottoms: center between hips
            if (leftHip?.score > minConfidence && rightHip?.score > minConfidence) {
                const centerX = (leftHip.x + rightHip.x) / 2
                const centerY = (leftHip.y + rightHip.y) / 2 + 40

                const hipWidth = Math.abs(leftHip.x - rightHip.x)
                const newScale = Math.max(0.4, Math.min(1.2, (hipWidth / videoWidth) * 4))

                setOverlayPosition({
                    x: (centerX / videoWidth) * 100,
                    y: (centerY / videoHeight) * 100
                })
                setOverlayScale(newScale)
            }
        } else if (productCategory === 'accessories') {
            // Position for accessories: near head/neck
            if (nose?.score > minConfidence) {
                setOverlayPosition({
                    x: (nose.x / videoWidth) * 100,
                    y: ((nose.y + 60) / videoHeight) * 100
                })
                setOverlayScale(0.35)
            }
        }
    }

    // Cleanup webcam on unmount or close
    useEffect(() => {
        if (!isOpen) {
            stopWebcam()
            setUserImage(null)
            setBodyPose(null)
            setDetectionStatus('idle')
        }
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [isOpen])

    // Handle file upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            stopWebcam()
            const reader = new FileReader()
            reader.onload = (e) => {
                setUserImage(e.target.result)
                // Run pose detection on static image
                if (poseDetector && autoPosition) {
                    detectPoseOnImage(e.target.result)
                }
            }
            reader.readAsDataURL(file)
        }
    }

    // Detect pose on uploaded image
    const detectPoseOnImage = async (imageSrc) => {
        try {
            setDetectionStatus('detecting')
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = async () => {
                try {
                    const poses = await poseDetector.estimatePoses(img)
                    if (poses.length > 0) {
                        setBodyPose(poses[0])
                        setDetectionStatus('detected')
                        updateOverlayFromPose(poses[0].keypoints, img.width, img.height)
                    } else {
                        setDetectionStatus('not-found')
                    }
                } catch (err) {
                    console.warn('Image pose detection failed:', err)
                    setDetectionStatus('not-found')
                }
            }
            img.src = imageSrc
        } catch (err) {
            setDetectionStatus('not-found')
        }
    }

    // Start webcam
    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
            setIsWebcamActive(true)
            setUserImage(null)
        } catch (err) {
            console.error('Webcam error:', err)
            alert('Could not access webcam. Please check permissions or upload an image instead.')
        }
    }

    // Stop webcam
    const stopWebcam = () => {
        stopPoseDetection()
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
        setIsWebcamActive(false)
    }

    // Capture photo from webcam
    const capturePhoto = () => {
        if (!videoRef.current) return

        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        const ctx = canvas.getContext('2d')

        // Mirror the image
        if (isMirrored) {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
        }
        ctx.drawImage(videoRef.current, 0, 0)

        setUserImage(canvas.toDataURL('image/png'))
        stopWebcam()
    }

    // Handle drag
    const handleDragStart = useCallback((e) => {
        e.preventDefault()
        setIsDragging(true)
        setAutoPosition(false) // Disable auto-positioning when user drags
    }, [])

    const handleDrag = useCallback((e) => {
        if (!isDragging || !containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY

        const x = ((clientX - rect.left) / rect.width) * 100
        const y = ((clientY - rect.top) / rect.height) * 100

        setOverlayPosition({
            x: Math.max(10, Math.min(90, x)),
            y: Math.max(10, Math.min(90, y))
        })
    }, [isDragging])

    const handleDragEnd = useCallback(() => {
        setIsDragging(false)
    }, [])

    // Touch handlers for mobile
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const touchHandler = (e) => {
            if (isDragging) {
                e.preventDefault()
                handleDrag(e)
            }
        }

        container.addEventListener('touchmove', touchHandler, { passive: false })
        container.addEventListener('touchend', handleDragEnd)

        return () => {
            container.removeEventListener('touchmove', touchHandler)
            container.removeEventListener('touchend', handleDragEnd)
        }
    }, [handleDrag, handleDragEnd, isDragging])

    // Zoom controls
    const zoomIn = () => setOverlayScale(prev => Math.min(prev + 0.1, 2.5))
    const zoomOut = () => setOverlayScale(prev => Math.max(prev - 0.1, 0.2))

    // Rotation controls
    const rotateLeft = () => setOverlayRotation(prev => prev - 15)
    const rotateRight = () => setOverlayRotation(prev => prev + 15)

    // Reset position
    const resetPosition = () => {
        const positions = {
            tops: { x: 50, y: 38, scale: 0.9 },
            bottoms: { x: 50, y: 68, scale: 0.75 },
            shoes: { x: 50, y: 88, scale: 0.5 },
            accessories: { x: 50, y: 22, scale: 0.4 }
        }
        const pos = positions[productCategory] || positions.tops
        setOverlayPosition({ x: pos.x, y: pos.y })
        setOverlayScale(pos.scale)
        setOverlayRotation(0)
        setOverlayOpacity(0.95)
        setAutoPosition(true)
    }

    // Download result
    const downloadImage = () => {
        if (!userImage && !isWebcamActive) return

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        const processDownload = (sourceElement, isVideo = false) => {
            canvas.width = isVideo ? sourceElement.videoWidth : sourceElement.width
            canvas.height = isVideo ? sourceElement.videoHeight : sourceElement.height

            ctx.drawImage(sourceElement, 0, 0)

            const productImg = new Image()
            productImg.crossOrigin = 'anonymous'
            productImg.src = productImage

            productImg.onload = () => {
                const overlayWidth = canvas.width * 0.35 * overlayScale
                const overlayHeight = overlayWidth * (productImg.height / productImg.width)
                const overlayX = (overlayPosition.x / 100) * canvas.width - overlayWidth / 2
                const overlayY = (overlayPosition.y / 100) * canvas.height - overlayHeight / 2

                ctx.save()
                ctx.globalAlpha = overlayOpacity
                ctx.translate(overlayX + overlayWidth / 2, overlayY + overlayHeight / 2)
                ctx.rotate((overlayRotation * Math.PI) / 180)
                ctx.drawImage(productImg, -overlayWidth / 2, -overlayHeight / 2, overlayWidth, overlayHeight)
                ctx.restore()

                const link = document.createElement('a')
                link.download = `minutemax-tryon-${Date.now()}.png`
                link.href = canvas.toDataURL('image/png')
                link.click()
            }
        }

        if (isWebcamActive && videoRef.current) {
            processDownload(videoRef.current, true)
        } else if (userImage) {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => processDownload(img, false)
            img.src = userImage
        }
    }

    // Share result
    const shareImage = async () => {
        if (!navigator.share) {
            alert('Sharing is not supported on this browser')
            return
        }

        try {
            await navigator.share({
                title: `MinuteMax Try-On: ${productName}`,
                text: `Check out how I look in ${productName}!`,
                url: window.location.href
            })
        } catch (err) {
            console.log('Share cancelled')
        }
    }

    // Get detection status display
    const getDetectionStatusDisplay = () => {
        switch (detectionStatus) {
            case 'loading':
                return { icon: <FiCpu className="spin" />, text: 'Loading AI...', color: 'var(--accent-color)' }
            case 'detecting':
                return { icon: <FiTarget className="pulse" />, text: 'Detecting body...', color: '#fbbf24' }
            case 'detected':
                return { icon: <FiEye />, text: 'Body detected ✓', color: '#34d399' }
            case 'not-found':
                return { icon: <FiTarget />, text: 'No body found', color: '#f87171' }
            default:
                return null
        }
    }

    if (!isOpen) return null

    const statusDisplay = getDetectionStatusDisplay()

    return (
        <AnimatePresence>
            <motion.div
                className="ar-overlay-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="ar-overlay-container"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="ar-header">
                        <div className="ar-header-left">
                            <h3>👕 Virtual Try-On</h3>
                            <p className="ar-product-name">{productName}</p>
                        </div>
                        <div className="ar-header-right">
                            {statusDisplay && (userImage || isWebcamActive) && (
                                <div className="detection-status" style={{ color: statusDisplay.color }}>
                                    {statusDisplay.icon}
                                    <span>{statusDisplay.text}</span>
                                </div>
                            )}
                            <button className="ar-close-btn" onClick={onClose}>
                                <FiX />
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="ar-content">
                        {!userImage && !isWebcamActive ? (
                            // Upload/Capture View
                            <div className="ar-upload-area">
                                <div className="ar-upload-icon">📸</div>
                                <h4>Start Your Virtual Try-On</h4>
                                <p>Take a selfie or upload a photo to see how this item looks on you</p>

                                {/* AI Status Badge */}
                                <div className={`ai-status-badge ${isPoseLoading ? 'loading' : poseDetector ? 'ready' : 'error'}`}>
                                    {isPoseLoading ? (
                                        <><FiCpu className="spin" /> Loading AI Body Detection...</>
                                    ) : poseDetector ? (
                                        <><FiCpu /> AI Body Detection Ready</>
                                    ) : (
                                        <><FiCpu /> Manual positioning mode</>
                                    )}
                                </div>

                                <div className="ar-upload-buttons">
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={startWebcam}
                                    >
                                        <FiCamera /> Use Camera
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <FiImage /> Upload Photo
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={handleFileUpload}
                                    />
                                </div>

                                <div className="ar-product-preview">
                                    <img src={productImage} alt={productName} />
                                    <span>Item to try on</span>
                                </div>

                                <div className="ar-tips">
                                    <h5>💡 Tips for best results:</h5>
                                    <ul>
                                        <li>Stand in good lighting</li>
                                        <li>Face the camera straight on</li>
                                        <li>AI will auto-position the clothing on you!</li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            // Try-On View
                            <div className="ar-tryon-area">
                                <div
                                    className="ar-canvas"
                                    ref={containerRef}
                                    onMouseMove={handleDrag}
                                    onMouseUp={handleDragEnd}
                                    onMouseLeave={handleDragEnd}
                                >
                                    {/* Webcam or User Image */}
                                    {isWebcamActive ? (
                                        <video
                                            ref={videoRef}
                                            className={`ar-video ${isMirrored ? 'mirrored' : ''}`}
                                            autoPlay
                                            playsInline
                                            muted
                                        />
                                    ) : (
                                        <img
                                            src={userImage}
                                            alt="Your photo"
                                            className="ar-user-image"
                                        />
                                    )}

                                    {/* Body Detection Guide Overlay */}
                                    {detectionStatus === 'not-found' && autoPosition && (
                                        <div className="body-guide-overlay">
                                            <div className="body-outline">
                                                <svg viewBox="0 0 100 200" preserveAspectRatio="xMidYMid meet">
                                                    <ellipse cx="50" cy="20" rx="15" ry="18" />
                                                    <line x1="50" y1="38" x2="50" y2="100" />
                                                    <line x1="50" y1="50" x2="20" y2="80" />
                                                    <line x1="50" y1="50" x2="80" y2="80" />
                                                    <line x1="50" y1="100" x2="30" y2="160" />
                                                    <line x1="50" y1="100" x2="70" y2="160" />
                                                </svg>
                                            </div>
                                            <span>Stand in frame for auto-position</span>
                                        </div>
                                    )}

                                    {/* Product Overlay */}
                                    <motion.div
                                        className={`ar-product-overlay ${detectionStatus === 'detected' ? 'auto-positioned' : ''}`}
                                        style={{
                                            left: `${overlayPosition.x}%`,
                                            top: `${overlayPosition.y}%`,
                                            transform: `translate(-50%, -50%) scale(${overlayScale}) rotate(${overlayRotation}deg)`,
                                            opacity: overlayOpacity,
                                            cursor: isDragging ? 'grabbing' : 'grab'
                                        }}
                                        onMouseDown={handleDragStart}
                                        onTouchStart={handleDragStart}
                                        animate={detectionStatus === 'detected' ? {
                                            boxShadow: ['0 0 0px rgba(52, 211, 153, 0)', '0 0 20px rgba(52, 211, 153, 0.5)', '0 0 0px rgba(52, 211, 153, 0)']
                                        } : {}}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        <img src={productImage} alt={productName} draggable="false" />
                                        <div className="overlay-handles">
                                            <FiMove />
                                            <span>Drag to adjust</span>
                                        </div>
                                    </motion.div>

                                    {/* Webcam Capture Button */}
                                    {isWebcamActive && (
                                        <button className="capture-btn" onClick={capturePhoto}>
                                            <FiCamera />
                                            <span>Capture</span>
                                        </button>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className={`ar-controls ${showControls ? '' : 'collapsed'}`}>
                                    <button
                                        className="controls-toggle"
                                        onClick={() => setShowControls(!showControls)}
                                    >
                                        <FiSliders /> {showControls ? 'Hide Controls' : 'Show Controls'}
                                    </button>

                                    {showControls && (
                                        <div className="controls-grid">
                                            {/* Auto-Position Toggle */}
                                            <div className="control-group full-width">
                                                <label>Smart Positioning</label>
                                                <button
                                                    className={`auto-position-toggle ${autoPosition ? 'active' : ''}`}
                                                    onClick={() => setAutoPosition(!autoPosition)}
                                                >
                                                    <FiCpu />
                                                    {autoPosition ? 'Auto (AI)' : 'Manual'}
                                                </button>
                                            </div>

                                            {/* Zoom Controls */}
                                            <div className="control-group">
                                                <label>Size</label>
                                                <div className="control-buttons">
                                                    <button onClick={zoomOut} title="Smaller">
                                                        <FiZoomOut />
                                                    </button>
                                                    <span className="control-value">{Math.round(overlayScale * 100)}%</span>
                                                    <button onClick={zoomIn} title="Larger">
                                                        <FiZoomIn />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Rotation Controls */}
                                            <div className="control-group">
                                                <label>Rotation</label>
                                                <div className="control-buttons">
                                                    <button onClick={rotateLeft} title="Rotate Left">
                                                        <FiRotateCw style={{ transform: 'scaleX(-1)' }} />
                                                    </button>
                                                    <span className="control-value">{overlayRotation}°</span>
                                                    <button onClick={rotateRight} title="Rotate Right">
                                                        <FiRotateCw />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Opacity Slider */}
                                            <div className="control-group full-width">
                                                <label>Opacity: {Math.round(overlayOpacity * 100)}%</label>
                                                <input
                                                    type="range"
                                                    min="0.3"
                                                    max="1"
                                                    step="0.05"
                                                    value={overlayOpacity}
                                                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                                                    className="opacity-slider"
                                                />
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="control-actions">
                                                <button onClick={resetPosition} title="Reset">
                                                    <FiRefreshCw /> Reset
                                                </button>
                                                <button onClick={downloadImage} title="Download" className="primary">
                                                    <FiDownload /> Save
                                                </button>
                                                <button onClick={shareImage} title="Share">
                                                    <FiShare2 /> Share
                                                </button>
                                            </div>

                                            {/* New Photo Button */}
                                            <div className="control-actions full-width">
                                                <button
                                                    onClick={() => {
                                                        setUserImage(null)
                                                        stopWebcam()
                                                        setAutoPosition(true)
                                                    }}
                                                    className="secondary"
                                                >
                                                    <FiCamera /> Take New Photo
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <p className="ar-tip">
                                    {autoPosition && poseDetector
                                        ? '🤖 AI is tracking your body to position the clothing automatically'
                                        : '💡 Drag the clothing item to position it perfectly on your photo'}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default AROverlay
