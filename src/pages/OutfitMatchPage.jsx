import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCamera, FiUpload, FiHeart, FiShoppingCart, FiRefreshCw, FiFilter, FiX, FiCheck, FiAlertCircle, FiZap, FiStar, FiCpu, FiLoader, FiCalendar, FiSliders, FiEye } from 'react-icons/fi'
import { outfitService, favoriteService, productService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import AROverlay from '../components/AROverlay'
import './OutfitMatchPage.css'

// Images
import outfitImage from '../assets/images/outfit-matching.png'
import fittingRoomImage from '../assets/images/fitting-room.png'

const OutfitMatchPage = () => {
    const { isAuthenticated } = useAuth()
    const [uploadedImage, setUploadedImage] = useState(null)
    const [uploadedFile, setUploadedFile] = useState(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [matchedOutfits, setMatchedOutfits] = useState([])
    const [analysis, setAnalysis] = useState(null)
    const [outfitSuggestion, setOutfitSuggestion] = useState(null)
    const [instantComplements, setInstantComplements] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [favorites, setFavorites] = useState([])
    const [error, setError] = useState(null)
    const [apiConnected, setApiConnected] = useState(true)
    const [analysisStep, setAnalysisStep] = useState('')

    // Filter states
    const [selectedOccasion, setSelectedOccasion] = useState('all')
    const [selectedBodyType, setSelectedBodyType] = useState('all')
    const [selectedSkinTone, setSelectedSkinTone] = useState('all')
    const [showFilters, setShowFilters] = useState(false)
    const [bookingModal, setBookingModal] = useState(null)
    const [arOverlay, setArOverlay] = useState(null)
    const [showCamera, setShowCamera] = useState(false)
    const [cameraStream, setCameraStream] = useState(null)
    const videoRef = React.useRef(null)
    const canvasRef = React.useRef(null)

    const categories = [
        { id: 'all', label: 'All' },
        { id: 'tops', label: 'Tops' },
        { id: 'bottoms', label: 'Bottoms' },
        { id: 'shoes', label: 'Shoes' },
        { id: 'accessories', label: 'Accessories' }
    ]

    // Filter options
    const occasions = [
        { id: 'all', label: 'All Occasions' },
        { id: 'casual', label: 'Casual' },
        { id: 'formal', label: 'Formal' },
        { id: 'party', label: 'Party' },
        { id: 'office', label: 'Office' },
        { id: 'wedding', label: 'Wedding' },
        { id: 'sport', label: 'Sports' }
    ]

    const bodyTypes = [
        { id: 'all', label: 'All Body Types' },
        { id: 'slim', label: 'Slim' },
        { id: 'athletic', label: 'Athletic' },
        { id: 'average', label: 'Average' },
        { id: 'curvy', label: 'Curvy' },
        { id: 'plus', label: 'Plus Size' }
    ]

    const skinTones = [
        { id: 'all', label: 'All Skin Tones' },
        { id: 'fair', label: 'Fair' },
        { id: 'light', label: 'Light' },
        { id: 'medium', label: 'Medium' },
        { id: 'tan', label: 'Tan' },
        { id: 'dark', label: 'Dark' }
    ]

    // Load favorites on mount
    useEffect(() => {
        if (isAuthenticated) {
            loadFavorites()
        }
    }, [isAuthenticated])

    const loadFavorites = async () => {
        try {
            const data = await favoriteService.getAll()
            setFavorites(data.map(p => p.id))
        } catch (err) {
            console.log('Could not load favorites')
        }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files[0]
        if (file) {
            setError(null)
            setUploadedFile(file)

            // Preview the image
            const reader = new FileReader()
            reader.onload = (e) => {
                setUploadedImage(e.target.result)
            }
            reader.readAsDataURL(file)

            // Analyze the image with AI
            await analyzeImage(file)
        }
    }

    const analyzeImage = async (file) => {
        setIsAnalyzing(true)
        setMatchedOutfits([])
        setAnalysis(null)
        setOutfitSuggestion(null)
        setInstantComplements([])
        setError(null)

        try {
            setAnalysisStep('☁️ Sending to Gemini Vision AI...')

            // Call backend API directly! Let Gemini do ALL the heavy lifting.
            try {
                const result = await outfitService.match(file)
                setApiConnected(true)

                setAnalysisStep('🎨 Processing Gemini Results...')
                await new Promise(r => setTimeout(r, 400)) // Tiny delay for smooth UX

                // USE PURE GEMINI RESULTS!
                setAnalysis({
                    detectedGender: result.analysis.detectedGender,
                    genderConfidence: result.analysis.genderConfidence,
                    detectedColors: result.analysis.detectedColors,
                    complementaryColors: result.analysis.complementaryColors,
                    detectedStyles: result.analysis.detectedStyles,
                    suggestedOccasions: result.analysis.suggestedOccasions,
                    confidence: result.analysis.confidence,
                    // Create a nice UI tag using Gemini's style data
                    aiPredictions: [{ 
                        className: result.analysis.detectedStyles[0] || 'Fashion Item', 
                        probability: (result.analysis.confidence / 100) || 0.95 
                    }] 
                })
                setMatchedOutfits(result.recommendations)
                setOutfitSuggestion(result.outfitSuggestion)
                setInstantComplements(result.instantComplements || [])
            } catch (apiErr) {
                console.log('API not available', apiErr)
                setApiConnected(false)
                setError('Backend AI is offline. Please check server logs.')
            }

            setAnalysisStep('')
        } catch (err) {
            console.error('Analysis error:', err)
            setError('Failed to analyze image. Please try again.')
            setAnalysisStep('')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const toggleFavorite = async (productId) => {
        if (!isAuthenticated) {
            setError('Please login to save favorites')
            return
        }

        try {
            if (favorites.includes(productId)) {
                await favoriteService.remove(productId)
                setFavorites(prev => prev.filter(id => id !== productId))
            } else {
                await favoriteService.add(productId)
                setFavorites(prev => [...prev, productId])
            }
        } catch (err) {
            setFavorites(prev =>
                prev.includes(productId)
                    ? prev.filter(id => id !== productId)
                    : [...prev, productId]
            )
        }
    }

    const filteredProducts = selectedCategory === 'all'
        ? matchedOutfits
        : matchedOutfits.filter(p => p.category === selectedCategory)

    const clearImage = () => {
        setUploadedImage(null)
        setUploadedFile(null)
        setMatchedOutfits([])
        setAnalysis(null)
        setOutfitSuggestion(null)
        setInstantComplements([])
        setError(null)
        setAnalysisStep('')
    }

    const openCamera = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Camera not supported on this connection. Please use HTTPS or localhost.')
                return
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            })
            setCameraStream(stream)
            setShowCamera(true)
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }
            }, 100)
        } catch (err) {
            console.error('Camera error:', err)
            if (err.name === 'NotAllowedError') {
                setError('Camera permission denied. Please allow camera access in your browser settings.')
            } else if (err.name === 'NotFoundError') {
                setError('No camera found on this device.')
            } else {
                setError('Camera not available. Try using HTTPS or upload a photo instead.')
            }
        }
    }

    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop())
            setCameraStream(null)
        }
        setShowCamera(false)
    }

    const capturePhoto = () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)

        canvas.toBlob(async (blob) => {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
            const imageUrl = URL.createObjectURL(blob)
            setUploadedImage(imageUrl)
            setUploadedFile(file)
            closeCamera()
            await analyzeImage(file)
        }, 'image/jpeg', 0.9)
    }

    return (
        <div className="outfit-page">
            <div className="outfit-bg-gradient" />

            {/* Header */}
            <section className="outfit-header">
                <div className="container">
                    <motion.div
                        className="outfit-header-content"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="page-label">AI Outfit Match</span>
                        <h1>Find Your Perfect <span className="gradient-text-accent">Style Match</span></h1>
                        <p>Upload a photo and our Gemini Vision AI will analyze it to recommend matching outfits</p>

                        {/* Model Status */}
                        <div className="model-status ready">
                            <FiCheck /> AI Model Ready (Gemini Cloud)
                        </div>

                        {!apiConnected && (
                            <div className="api-status">
                                <FiAlertCircle /> Demo mode - Backend offline
                            </div>
                        )}
                    </motion.div>
                </div>
            </section>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        className="error-message"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <FiAlertCircle />
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>×</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <section className="outfit-content">
                <div className="container">
                    <div className="outfit-layout">
                        {/* Upload Section */}
                        <div className="upload-section">
                            <motion.div
                                className="upload-card"
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                {!uploadedImage ? (
                                    <>
                                        <label className="upload-area">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                hidden
                                            />
                                            <div className="upload-icon">
                                                <FiUpload />
                                            </div>
                                            <h3>Upload Your Photo</h3>
                                            <p>Drag and drop or click to upload</p>
                                            <span className="upload-hint">Supports JPG, PNG, WebP up to 10MB</span>
                                            <div className="ai-detect-badge">
                                                <FiCpu /> Gemini Cloud AI
                                            </div>
                                        </label>
                                        <button className="camera-btn" onClick={openCamera}>
                                            <FiCamera /> Use Camera
                                        </button>
                                    </>
                                ) : (
                                    <div className="uploaded-preview">
                                        <img src={uploadedImage} alt="Uploaded" />
                                        <button className="clear-btn" onClick={clearImage}>
                                            <FiX />
                                        </button>
                                        {isAnalyzing && (
                                            <div className="analyzing-overlay">
                                                <div className="analyzing-spinner" />
                                                <span>{analysisStep || 'Analyzing with AI...'}</span>
                                                <div className="ai-badge">
                                                    <FiCpu /> Gemini AI
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                            
                            {/* Camera Modal */}
                            {showCamera && (
                                <div className="camera-modal-overlay">
                                    <div className="camera-modal">
                                        <button className="camera-close-btn" onClick={closeCamera}>
                                            <FiX />
                                        </button>
                                        <h3><FiCamera /> Take a Photo</h3>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            style={{ width: '100%', borderRadius: '12px' }}
                                        />
                                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                                        <button className="capture-btn" onClick={capturePhoto}>
                                            📸 Capture
                                        </button>
                                    </div>
                                </div>
                            )}

                            {uploadedImage && !isAnalyzing && analysis && (
                                <motion.div
                                    className="analysis-result"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <div className="result-header">
                                        <FiCheck className="success-icon" />
                                        <span>AI Analysis Complete ({analysis.confidence}% confidence)</span>
                                    </div>

                                    {/* AI Predictions */}
                                    {analysis.aiPredictions && analysis.aiPredictions.length > 0 && (
                                        <div className="ai-predictions">
                                            <label>AI Detected:</label>
                                            <div className="prediction-tags">
                                                {analysis.aiPredictions.map((pred, i) => (
                                                    <span key={i} className="prediction-tag">
                                                        {pred.className} ({Math.round(pred.probability * 100)}%)
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Gender Badge */}
                                    {analysis.detectedGender && analysis.detectedGender !== 'unisex' && (
                                        <div className={`gender-badge ${analysis.detectedGender}`}>
                                            {analysis.detectedGender === 'men' ? '👔' : '👗'}
                                            Showing {analysis.detectedGender === 'men' ? "Men's" : "Women's"} Clothing
                                        </div>
                                    )}

                                    {/* Instant Complements Badge */}
                                    {instantComplements.length > 0 && (
                                        <div className="instant-badge">
                                            <FiZap /> {matchedOutfits.length} Matching Items Found
                                        </div>
                                    )}

                                    <div className="detected-section">
                                        <label>Detected Colors:</label>
                                        <div className="detected-tags">
                                            {analysis.detectedColors?.map((color, i) => (
                                                <span key={i} className="color-tag">{color}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="detected-section">
                                        <label>Complementary Colors:</label>
                                        <div className="detected-tags">
                                            {analysis.complementaryColors?.slice(0, 4).map((color, i) => (
                                                <span key={i} className="color-tag complement">{color}</span>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Results Section */}
                        <div className="results-section">
                            {matchedOutfits.length > 0 ? (
                                <>
                                    <div className="results-header">
                                        <h2>
                                            <FiStar /> Matched Outfits ({filteredProducts.length})
                                        </h2>
                                        <div className="header-actions">
                                            <button
                                                className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
                                                onClick={() => setShowFilters(!showFilters)}
                                            >
                                                <FiSliders /> Filters
                                            </button>
                                        </div>
                                    </div>

                                    {/* Advanced Filters Panel */}
                                    <AnimatePresence>
                                        {showFilters && (
                                            <motion.div
                                                className="filters-panel"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                            >
                                                <div className="filter-group">
                                                    <label>Occasion</label>
                                                    <select
                                                        value={selectedOccasion}
                                                        onChange={(e) => setSelectedOccasion(e.target.value)}
                                                    >
                                                        {occasions.map(o => (
                                                            <option key={o.id} value={o.id}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="filter-group">
                                                    <label>Body Type</label>
                                                    <select
                                                        value={selectedBodyType}
                                                        onChange={(e) => setSelectedBodyType(e.target.value)}
                                                    >
                                                        {bodyTypes.map(b => (
                                                            <option key={b.id} value={b.id}>{b.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="filter-group">
                                                    <label>Skin Tone</label>
                                                    <select
                                                        value={selectedSkinTone}
                                                        onChange={(e) => setSelectedSkinTone(e.target.value)}
                                                    >
                                                        {skinTones.map(s => (
                                                            <option key={s.id} value={s.id}>{s.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Category Filter */}
                                    <div className="category-filter">
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                className={`filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                                                onClick={() => setSelectedCategory(cat.id)}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="products-grid">
                                        {filteredProducts.map((product, index) => (
                                            <motion.div
                                                key={product.id}
                                                className={`product-card ${product.slow_moving ? 'slow-moving' : ''}`}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <div className="product-image">
                                                    <img src={product.image_url} alt={product.name} />
                                                    <div className="match-score">
                                                        {product.match_score}% Match
                                                    </div>
                                                    {product.slow_moving && (
                                                        <div className="slow-moving-badge">
                                                            🔥 {product.discount}% OFF
                                                        </div>
                                                    )}
                                                    <button
                                                        className={`favorite-btn ${favorites.includes(product.id) ? 'active' : ''}`}
                                                        onClick={() => toggleFavorite(product.id)}
                                                    >
                                                        <FiHeart />
                                                    </button>
                                                </div>
                                                <div className="product-info">
                                                    <span className="product-category">{product.category}</span>
                                                    <h4>{product.name}</h4>
                                                    <div className="match-reason">
                                                        {product.slow_moving ? '💎 Special Deal - Limited Stock!' : product.match_reason}
                                                    </div>

                                                    {/* AR Try-On Button */}
                                                    <button
                                                        className="ar-tryon-main-btn"
                                                        onClick={() => setArOverlay(product)}
                                                    >
                                                        <FiEye /> Virtual Try-On
                                                    </button>

                                                    <div className="product-footer">
                                                        <div className="price-container">
                                                            {product.slow_moving ? (
                                                                <>
                                                                    <span className="original-price">Rs. {product.price?.toLocaleString()}</span>
                                                                    <span className="product-price discounted">
                                                                        Rs. {Math.round(product.price * (1 - product.discount / 100))?.toLocaleString()}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="product-price">Rs. {product.price?.toLocaleString()}</span>
                                                            )}
                                                        </div>
                                                        <div className="product-actions">
                                                            <button
                                                                className="book-fitting-btn"
                                                                onClick={() => setBookingModal(product)}
                                                                title="Book Fitting Room"
                                                            >
                                                                <FiCalendar />
                                                            </button>
                                                            <button className="add-cart-btn">
                                                                <FiShoppingCart />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Booking Modal */}
                                    <AnimatePresence>
                                        {bookingModal && (
                                            <motion.div
                                                className="booking-modal-overlay"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                onClick={() => setBookingModal(null)}
                                            >
                                                <motion.div
                                                    className="booking-modal"
                                                    initial={{ scale: 0.9, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.9, opacity: 0 }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button className="modal-close" onClick={() => setBookingModal(null)}>
                                                        <FiX />
                                                    </button>
                                                    <div className="modal-header">
                                                        <FiCalendar />
                                                        <h3>Book Fitting Room</h3>
                                                    </div>
                                                    <div className="modal-content">
                                                        <div className="booking-product">
                                                            <img src={bookingModal.image_url} alt={bookingModal.name} />
                                                            <div>
                                                                <h4>{bookingModal.name}</h4>
                                                                <p>Rs. {bookingModal.price?.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <p className="booking-info">
                                                            Join the fitting room queue to try on this item.
                                                            You'll receive a notification when it's your turn.
                                                        </p>
                                                        <a
                                                            href="/queue"
                                                            className="btn btn-primary btn-block"
                                                        >
                                                            <FiCalendar /> Join Fitting Room Queue
                                                        </a>
                                                    </div>
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            ) : (
                                <div className="empty-results">
                                    <FiUpload />
                                    <h3>Upload an Image to Get Started</h3>
                                    <p>Our Gemini Vision AI will analyze your photo and recommend matching outfits instantly.</p>
                                    <div className="ai-features">
                                        <span>🤖 Gemini Flash 1.5</span>
                                        <span>🎨 Smart Color Detection</span>
                                        <span>👔 Style Inference</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* AR Overlay Modal */}
            <AROverlay
                isOpen={!!arOverlay}
                productImage={arOverlay?.image_url}
                productName={arOverlay?.name}
                productCategory={arOverlay?.category?.toLowerCase() || 'tops'}
                onClose={() => setArOverlay(null)}
            />
        </div>
    )
}

export default OutfitMatchPage