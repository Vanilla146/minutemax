/**
 * AI Image Classifier Service
 * Uses TensorFlow.js with MobileNet for clothing detection
 */

import * as tf from '@tensorflow/tfjs'
import * as mobilenet from '@tensorflow-models/mobilenet'

// Model instance (singleton)
let model = null
let modelLoading = false
let tfInitialized = false

// Clothing-related labels from MobileNet/ImageNet
const CLOTHING_LABELS = {
    // Men's clothing keywords
    men: [
        'suit', 'tie', 'bow tie', 'Windsor tie', 'blazer', 'sports jacket',
        'trench coat', 'military uniform', 'academic gown', 'tuxedo',
        'jean, blue jean, denim', 'swimming trunks', 'boxer shorts'
    ],
    // Women's clothing keywords
    women: [
        'dress', 'gown', 'evening gown', 'wedding gown', 'miniskirt',
        'hoopskirt', 'overskirt', 'sarong', 'maillot', 'bikini',
        'brassiere', 'kimono', 'abaya', 'stole'
    ],
    // Unisex clothing keywords
    unisex: [
        'jersey', 'T-shirt', 'sweatshirt', 'cardigan', 'sweater',
        'poncho', 'cloak', 'lab coat', 'raincoat', 'trench coat',
        'jean', 'pajama', 'bathrobe', 'fur coat'
    ],
    // Footwear keywords
    shoes: [
        'running shoe', 'sneaker', 'tennis shoe', 'loafer', 'Oxford shoe',
        'boot', 'cowboy boot', 'sandal', 'clog', 'slipper', 'flip-flop',
        'high heel', 'pump', 'stiletto'
    ],
    // Accessories keywords
    accessories: [
        'handbag', 'purse', 'backpack', 'wallet', 'briefcase',
        'sunglasses', 'sunglass', 'watch', 'necklace', 'earring',
        'ring', 'bracelet', 'hat', 'cap', 'beret', 'bonnet',
        'scarf', 'neckerchief', 'belt', 'buckle'
    ],
    // Person detection keywords
    person: [
        'person', 'man', 'woman', 'boy', 'girl', 'child', 'adult',
        'face', 'head', 'portrait'
    ]
}

// Color detection helper
const COLOR_RANGES = {
    'Red': { r: [180, 255], g: [0, 100], b: [0, 100] },
    'Blue': { r: [0, 100], g: [0, 150], b: [150, 255] },
    'Navy': { r: [0, 50], g: [0, 80], b: [80, 140] },
    'Green': { r: [0, 100], g: [150, 255], b: [0, 100] },
    'Yellow': { r: [200, 255], g: [200, 255], b: [0, 100] },
    'Orange': { r: [200, 255], g: [100, 180], b: [0, 80] },
    'Purple': { r: [100, 180], g: [0, 100], b: [150, 255] },
    'Pink': { r: [200, 255], g: [100, 180], b: [150, 220] },
    'Brown': { r: [100, 180], g: [60, 120], b: [20, 80] },
    'Black': { r: [0, 50], g: [0, 50], b: [0, 50] },
    'White': { r: [220, 255], g: [220, 255], b: [220, 255] },
    'Grey': { r: [100, 180], g: [100, 180], b: [100, 180] },
    'Beige': { r: [200, 250], g: [180, 220], b: [150, 190] },
    'Cream': { r: [240, 255], g: [230, 250], b: [200, 230] }
}

/**
 * Initialize TensorFlow.js backend
 */
const initializeTensorFlow = async () => {
    if (tfInitialized) return

    try {
        // Try to set up WebGL backend (more compatible than WebGPU)
        await tf.setBackend('webgl')
        await tf.ready()
        tfInitialized = true
        console.log('[TensorFlow] Initialized with backend:', tf.getBackend())
    } catch (error) {
        console.warn('[TensorFlow] WebGL backend failed, trying CPU:', error.message)
        try {
            await tf.setBackend('cpu')
            await tf.ready()
            tfInitialized = true
            console.log('[TensorFlow] Initialized with CPU backend')
        } catch (cpuError) {
            console.error('[TensorFlow] Failed to initialize:', cpuError)
            throw cpuError
        }
    }
}

/**
 * Load MobileNet model (lazy loading)
 */
export const loadModel = async () => {
    if (model) return model
    if (modelLoading) {
        // Wait for existing load
        while (modelLoading) {
            await new Promise(r => setTimeout(r, 100))
        }
        return model
    }

    modelLoading = true
    console.log('🤖 Loading MobileNet model...')

    try {
        // Ensure TensorFlow is initialized first
        await initializeTensorFlow()

        model = await mobilenet.load({
            version: 2,
            alpha: 1.0
        })
        console.log('✅ MobileNet model loaded successfully')
        return model
    } catch (error) {
        console.error('❌ Failed to load MobileNet model:', error)
        throw error
    } finally {
        modelLoading = false
    }
}

/**
 * Classify an image and detect clothing
 * @param {HTMLImageElement|File} imageSource - Image to classify
 * @returns {Object} Classification results
 */
export const classifyImage = async (imageSource) => {
    // Ensure model is loaded
    const classifier = await loadModel()

    // Convert File to Image element if needed
    let imgElement
    if (imageSource instanceof File) {
        imgElement = await fileToImage(imageSource)
    } else {
        imgElement = imageSource
    }

    // Get MobileNet predictions
    const predictions = await classifier.classify(imgElement, 10)
    console.log('🔍 MobileNet predictions:', predictions)

    // Analyze predictions
    const analysis = analyzeClothing(predictions)

    // Extract colors from image
    const colors = await extractColors(imgElement)

    return {
        predictions,
        ...analysis,
        detectedColors: colors.dominant,
        complementaryColors: colors.complementary,
        confidence: Math.round(analysis.confidence * 100)
    }
}

/**
 * Convert File to HTMLImageElement
 */
const fileToImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = e.target.result
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

/**
 * Analyze MobileNet predictions for clothing context
 */
const analyzeClothing = (predictions) => {
    let gender = 'unisex'
    let genderConfidence = 0
    let category = 'tops'
    let clothingType = null
    let hasPerson = false

    for (const pred of predictions) {
        const label = pred.className.toLowerCase()
        const prob = pred.probability

        // Check for person
        if (CLOTHING_LABELS.person.some(p => label.includes(p.toLowerCase()))) {
            hasPerson = true
        }

        // Check men's clothing
        if (CLOTHING_LABELS.men.some(c => label.includes(c.toLowerCase()))) {
            if (prob > genderConfidence) {
                gender = 'men'
                genderConfidence = prob
                clothingType = pred.className
            }
        }

        // Check women's clothing
        if (CLOTHING_LABELS.women.some(c => label.includes(c.toLowerCase()))) {
            if (prob > genderConfidence) {
                gender = 'women'
                genderConfidence = prob
                clothingType = pred.className
            }
        }

        // Check shoes
        if (CLOTHING_LABELS.shoes.some(s => label.includes(s.toLowerCase()))) {
            category = 'shoes'
            clothingType = pred.className
        }

        // Check accessories
        if (CLOTHING_LABELS.accessories.some(a => label.includes(a.toLowerCase()))) {
            category = 'accessories'
            clothingType = pred.className
        }
    }

    // If no gender detected but person found, default based on common patterns
    if (gender === 'unisex' && hasPerson) {
        genderConfidence = 0.6 // Lower confidence
    }

    return {
        detectedGender: gender,
        genderConfidence,
        category,
        clothingType,
        hasPerson,
        confidence: genderConfidence || 0.7
    }
}

/**
 * Extract dominant colors from image
 */
const extractColors = async (imgElement) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // Resize for faster processing
    const maxSize = 100
    const scale = Math.min(maxSize / imgElement.width, maxSize / imgElement.height)
    canvas.width = imgElement.width * scale
    canvas.height = imgElement.height * scale

    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data

    // Count colors
    const colorCounts = {}

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]

        const colorName = matchColor(r, g, b)
        if (colorName) {
            colorCounts[colorName] = (colorCounts[colorName] || 0) + 1
        }
    }

    // Sort by frequency
    const sortedColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color)
        .slice(0, 4)

    // Get complementary colors
    const complementary = getComplementaryColors(sortedColors[0] || 'White')

    return {
        dominant: sortedColors,
        complementary
    }
}

/**
 * Match RGB to named color
 */
const matchColor = (r, g, b) => {
    for (const [name, range] of Object.entries(COLOR_RANGES)) {
        if (
            r >= range.r[0] && r <= range.r[1] &&
            g >= range.g[0] && g <= range.g[1] &&
            b >= range.b[0] && b <= range.b[1]
        ) {
            return name
        }
    }
    return null
}

/**
 * Get complementary colors
 */
const getComplementaryColors = (primaryColor) => {
    const colorPairs = {
        'White': ['Black', 'Navy', 'Blue', 'Grey'],
        'Black': ['White', 'Red', 'Pink', 'Yellow'],
        'Blue': ['White', 'Cream', 'Brown', 'Orange'],
        'Navy': ['White', 'Cream', 'Beige', 'Pink'],
        'Red': ['White', 'Black', 'Cream', 'Navy'],
        'Green': ['White', 'Brown', 'Beige', 'Cream'],
        'Yellow': ['Black', 'Navy', 'Grey', 'Purple'],
        'Grey': ['White', 'Black', 'Pink', 'Blue'],
        'Brown': ['White', 'Cream', 'Beige', 'Blue'],
        'Pink': ['White', 'Grey', 'Navy', 'Black'],
        'Purple': ['White', 'Yellow', 'Grey', 'Black'],
        'Orange': ['White', 'Navy', 'Blue', 'Brown'],
        'Beige': ['Navy', 'Brown', 'White', 'Black'],
        'Cream': ['Navy', 'Brown', 'Black', 'Blue']
    }
    return colorPairs[primaryColor] || ['White', 'Black', 'Grey']
}

/**
 * Check if model is ready
 */
export const isModelReady = () => model !== null

/**
 * Preload model in background
 */
export const preloadModel = () => {
    loadModel().catch(console.error)
}

export default {
    loadModel,
    classifyImage,
    isModelReady,
    preloadModel
}
