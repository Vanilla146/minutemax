import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCamera, FiUpload, FiHeart, FiShoppingCart, FiRefreshCw, FiFilter, FiX, FiCheck, FiAlertCircle, FiZap, FiStar, FiCpu, FiLoader, FiCalendar, FiSliders, FiEye } from 'react-icons/fi'
import { outfitService, favoriteService, productService } from '../services/api'
import { classifyImage, preloadModel, isModelReady } from '../services/imageClassifier'
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
    const [modelStatus, setModelStatus] = useState('loading')

    // Filter states
    const [selectedOccasion, setSelectedOccasion] = useState('all')
    const [selectedBodyType, setSelectedBodyType] = useState('all')
    const [selectedSkinTone, setSelectedSkinTone] = useState('all')
    const [showFilters, setShowFilters] = useState(false)
    const [bookingModal, setBookingModal] = useState(null)
    const [arOverlay, setArOverlay] = useState(null)

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

    // Preload TensorFlow.js model on mount
    useEffect(() => {
        const initModel = async () => {
            try {
                setModelStatus('loading')
                await preloadModel()
                setModelStatus('ready')
                console.log('✅ AI Model ready')
            } catch (err) {
                setModelStatus('error')
                console.error('❌ Failed to load AI model:', err)
            }
        }
        initModel()
    }, [])

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
            // Step 1: AI Image Classification with TensorFlow.js
            setAnalysisStep('🤖 Loading AI model...')

            if (modelStatus !== 'ready') {
                await preloadModel()
            }

            setAnalysisStep('🔍 Analyzing image with AI...')
            await new Promise(r => setTimeout(r, 300))

            // Use TensorFlow.js to classify the image
            const aiResult = await classifyImage(file)
            console.log('🎯 AI Classification result:', aiResult)

            setAnalysisStep('👔 Detecting clothing type...')
            await new Promise(r => setTimeout(r, 300))

            setAnalysisStep('🎨 Extracting colors...')
            await new Promise(r => setTimeout(r, 300))

            setAnalysisStep('✨ Finding matching outfits...')

            // Try to call backend API with AI-detected gender
            try {
                const result = await outfitService.match(file, aiResult.detectedGender)
                setApiConnected(true)

                // Merge AI analysis with API results
                setAnalysis({
                    ...result.analysis,
                    detectedGender: aiResult.detectedGender,
                    genderConfidence: aiResult.genderConfidence,
                    detectedColors: aiResult.detectedColors,
                    complementaryColors: aiResult.complementaryColors,
                    clothingType: aiResult.clothingType,
                    confidence: aiResult.confidence,
                    aiPredictions: aiResult.predictions?.slice(0, 3)
                })
                setMatchedOutfits(result.recommendations)
                setOutfitSuggestion(result.outfitSuggestion)
                setInstantComplements(result.instantComplements || [])
            } catch (apiErr) {
                console.log('API not available, using AI results with mock products')
                setApiConnected(false)

                // Use AI results directly
                setAnalysis({
                    detectedGender: aiResult.detectedGender,
                    genderConfidence: Math.round(aiResult.genderConfidence * 100),
                    detectedColors: aiResult.detectedColors,
                    complementaryColors: aiResult.complementaryColors,
                    clothingType: aiResult.clothingType,
                    detectedStyles: ['Casual', 'Modern'],
                    suggestedOccasions: ['Daily Wear', 'Weekend', 'Shopping'],
                    confidence: aiResult.confidence,
                    aiPredictions: aiResult.predictions?.slice(0, 3)
                })

                // Generate mock products based on AI detection
                const mockProducts = generateMockProducts(aiResult.detectedGender, aiResult.detectedColors)
                setMatchedOutfits(mockProducts)
                setInstantComplements(mockProducts.slice(0, 5).map(p => ({
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    matchScore: p.match_score,
                    reason: p.match_reason
                })))
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

    // Generate mock products based on AI detection
    const generateMockProducts = (gender, colors) => {
        const primaryColor = colors?.[0] || 'Blue'

        // Products with slow_moving flag for AI suggestions to highlight
        const menProducts = [
            { id: 1, name: "Men's Classic White Shirt", category: 'tops', price: 4500, match_score: 95, match_reason: 'Perfect Color Match', image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop', color: 'White', gender: 'men', slow_moving: false },
            { id: 2, name: "Men's Blue Denim Jeans", category: 'bottoms', price: 7500, match_score: 92, match_reason: 'Complementary Color', image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', color: 'Blue', gender: 'men', slow_moving: false },
            { id: 3, name: "Men's Brown Leather Belt", category: 'accessories', price: 2500, match_score: 88, match_reason: 'Style Complement', image_url: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400&h=400&fit=crop', color: 'Brown', gender: 'men', slow_moving: true, discount: 20 },
            { id: 4, name: "Men's Navy Blazer", category: 'tops', price: 18000, match_score: 90, match_reason: 'AI Recommended', image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop', color: 'Navy', gender: 'men', slow_moving: true, discount: 15 },
            { id: 5, name: "Men's White Sneakers", category: 'shoes', price: 8500, match_score: 85, match_reason: 'Style Match', image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', color: 'White', gender: 'men', slow_moving: false },
            { id: 6, name: "Men's Khaki Chinos", category: 'bottoms', price: 5500, match_score: 83, match_reason: 'Color Complement', image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=400&fit=crop', color: 'Khaki', gender: 'men', slow_moving: true, discount: 25 },
            { id: 7, name: "Men's Silver Watch", category: 'accessories', price: 25000, match_score: 80, match_reason: 'Accessory Match', image_url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop', color: 'Silver', gender: 'men', slow_moving: false },
            { id: 8, name: "Men's Brown Leather Shoes", category: 'shoes', price: 12000, match_score: 87, match_reason: 'Perfect Match', image_url: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400&h=400&fit=crop', color: 'Brown', gender: 'men', slow_moving: false }
        ]

        const womenProducts = [
            { id: 1, name: "Women's White Blouse", category: 'tops', price: 4500, match_score: 95, match_reason: 'Perfect Color Match', image_url: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&h=400&fit=crop', color: 'White', gender: 'women', slow_moving: false },
            { id: 2, name: "Women's Blue Jeans", category: 'bottoms', price: 6500, match_score: 92, match_reason: 'Complementary Color', image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop', color: 'Blue', gender: 'women', slow_moving: false },
            { id: 3, name: "Women's Gold Necklace", category: 'accessories', price: 15000, match_score: 88, match_reason: 'Style Complement', image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop', color: 'Gold', gender: 'women', slow_moving: true, discount: 30 },
            { id: 4, name: "Women's Black Dress", category: 'tops', price: 8500, match_score: 90, match_reason: 'AI Recommended', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop', color: 'Black', gender: 'women', slow_moving: false },
            { id: 5, name: "Women's White Sneakers", category: 'shoes', price: 7500, match_score: 85, match_reason: 'Style Complement', image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=400&fit=crop', color: 'White', gender: 'women', slow_moving: true, discount: 20 },
            { id: 6, name: "Women's Black Skirt", category: 'bottoms', price: 4500, match_score: 83, match_reason: 'Color Complement', image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0afe1?w=400&h=400&fit=crop', color: 'Black', gender: 'women', slow_moving: false },
            { id: 7, name: "Women's Leather Handbag", category: 'accessories', price: 18000, match_score: 80, match_reason: 'Accessory Match', image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop', color: 'Brown', gender: 'women', slow_moving: true, discount: 25 },
            { id: 8, name: "Women's High Heels", category: 'shoes', price: 9500, match_score: 87, match_reason: 'Perfect Match', image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', color: 'Black', gender: 'women', slow_moving: false }
        ]

        if (gender === 'men') return menProducts
        if (gender === 'women') return womenProducts

        // Mix for unisex
        return [...menProducts.slice(0, 4), ...womenProducts.slice(0, 4)]
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
                        <p>Upload a photo and our TensorFlow.js AI will analyze it to recommend matching outfits</p>

                        {/* Model Status */}
                        <div className={`model-status ${modelStatus}`}>
                            {modelStatus === 'loading' && <><FiLoader className="spin" /> Loading AI Model...</>}
                            {modelStatus === 'ready' && <><FiCheck /> AI Model Ready (MobileNet)</>}
                            {modelStatus === 'error' && <><FiAlertCircle /> AI Model Error - Using Fallback</>}
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
                                    <label className="upload-area">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            hidden
                                        />
                                        <div className="upload-icon">
                                            <FiCamera />
                                        </div>
                                        <h3>Upload Your Photo</h3>
                                        <p>Drag and drop or click to upload</p>
                                        <span className="upload-hint">Supports JPG, PNG, WebP up to 10MB</span>
                                        <div className="ai-detect-badge">
                                            <FiCpu /> TensorFlow.js + MobileNet
                                        </div>
                                    </label>
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
                                                    <FiCpu /> TensorFlow.js
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>

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

                                                    {/* AR Try-On Button - Prominent */}
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
                                    <p>Our TensorFlow.js AI will analyze your photo in real-time and recommend matching outfits</p>
                                    <div className="ai-features">
                                        <span>🤖 MobileNet Classification</span>
                                        <span>🎨 Color Detection</span>
                                        <span>👔 Gender Inference</span>
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
