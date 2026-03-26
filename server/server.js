import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import nodemailer from 'nodemailer'
import { GoogleGenerativeAI } from '@google/generative-ai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000
const JWT_SECRET = 'minutemax_secret_key_2024'

// ========================
// GMAIL SMTP CONFIGURATION
// ========================
// To use this, you need to:
// 1. Enable 2FA on your Google Account
// 2. Generate an App Password at https://myaccount.google.com/apppasswords
// 3. Replace the email and password below

const EMAIL_CONFIG = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
        user: 'vanulvilhan146@gmail.com', // Replace with your Gmail
        pass: 'hdzu yzkx taug ewky' // Replace with your App Password (16 characters)
    }
}


// OneSignal Push Notification Helper
// OneSignal Push Notification Helper
const sendOneSignalPush = async (playerId, title, message) => {
    if (!playerId) return; 
    try {
        await axios.post('https://onesignal.com/api/v1/notifications', {
            app_id: process.env.ONESIGNAL_APP_ID,
            include_player_ids: [playerId],
            headings: { "en": title },
            contents: { "en": message }
        }, {
            headers: {
                'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`📱 [SENT] Push notification to player: ${playerId}`);
    } catch (error) {
        console.error("❌ OneSignal Push Error:", error.response?.data || error.message);
    }
};
// Create email transporter
let emailTransporter = null
try {
    emailTransporter = nodemailer.createTransport(EMAIL_CONFIG)
    console.log('📧 Email transporter initialized')
} catch (err) {
    console.log('⚠️ Email transporter not configured - notifications disabled')
}

// Notification logs for fallback handling
const notificationLogs = []

// Function to send email notification
const sendEmailNotification = async (to, subject, body) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        to,
        subject,
        status: 'pending',
        error: null
    }

    try {
        if (!emailTransporter) {
            logEntry.status = 'skipped'
            logEntry.error = 'Email transporter not configured'
            notificationLogs.push(logEntry)
            console.log(`📧 [SKIPPED] Email to ${to}: ${subject}`)
            return { success: false, reason: 'not_configured' }
        }

        const mailOptions = {
            from: `"MinuteMax Queue" <${EMAIL_CONFIG.auth.user}>`,
            to: to,
            subject: subject,
            text: body,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🛍️ MinuteMax</h1>
                    </div>
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333; margin-top: 0;">${subject}</h2>
                        <p style="color: #555; font-size: 16px; line-height: 1.6;">${body}</p>
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                        <p style="color: #888; font-size: 12px;">This is an automated notification from MinuteMax Fashion Store.</p>
                    </div>
                </div>
            `
        }

        const info = await emailTransporter.sendMail(mailOptions)
        logEntry.status = 'sent'
        logEntry.messageId = info.messageId
        notificationLogs.push(logEntry)
        console.log(`📧 [SENT] Email to ${to}: ${subject}`)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        logEntry.status = 'failed'
        logEntry.error = error.message
        notificationLogs.push(logEntry)
        console.error(`📧 [FAILED] Email to ${to}: ${error.message}`)
        return { success: false, error: error.message }
    }
}

// Function to check and send queue notifications
const checkAndSendQueueNotifications = async () => {
    try {
        const connection = await pool.getConnection()

        // 👉 UPDATED SELECT QUERY TO GRAB os_player_id
        const [usersToNotify] = await connection.query(`
            SELECT q.id, q.user_id, q.queue_type, q.position, q.notified_at, q.os_player_id,
                   u.name, u.email, u.phone,
                   s.name as store_name
            FROM queues q
            JOIN users u ON q.user_id = u.id
            JOIN stores s ON q.store_id = s.id
            WHERE q.status = 'waiting'
              AND q.position <= 3
              AND (q.notified_at IS NULL OR q.notified_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE))
        `)

        for (const user of usersToNotify) {
            if (user.email) {
                let subject, body
                if (user.position === 1) {
                    subject = "🎉 It's Your Turn at MinuteMax!"
                    body = `Hi ${user.name}! It's your turn now. Please proceed to the ${user.queue_type === 'fitting_room' ? 'Fitting Room' : 'Cashier'} at ${user.store_name}.`
                } else {
                    subject = "⏰ Almost Your Turn at MinuteMax!"
                    body = `Hi ${user.name}! Only ${user.position - 1} ${user.position - 1 === 1 ? 'person' : 'people'} ahead of you in the ${user.queue_type === 'fitting_room' ? 'Fitting Room' : 'Cashier'} queue. Please be ready!`
                }

                await sendEmailNotification(user.email, subject, body)

                // 👉 NEW: SEND THE ONESIGNAL PUSH NOTIFICATION HERE!
                if (user.os_player_id) {
                    await sendOneSignalPush(user.os_player_id, subject, body);
                }

                // Mark as notified
                await connection.query(
                    'UPDATE queues SET notified_at = NOW() WHERE id = ?',
                    [user.id]
                )
            }
        }

        connection.release()
    } catch (error) {
        console.error('Notification check error:', error.message)
    }
}

// Note: setInterval will be started after pool is created (see below)

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}

// Multer configuration for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir)
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
        cb(null, uniqueName)
    }
})

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'))
        }
    }
})

// Middleware
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadsDir))

// MySQL Connection Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'minutemax',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

// Start notification check interval after pool is created
setInterval(checkAndSendQueueNotifications, 30000)
console.log('⏰ Queue notification check started (every 30 seconds)')

// Platzi Fake Store API URL
const PLATZI_API_URL = 'https://api.escuelajs.co/api/v1'

// Function to fetch products from Platzi Fake Store API
const fetchAndStoreProducts = async (connection) => {
    try {
        // Fetch all categories first
        const categoriesResponse = await axios.get(`${PLATZI_API_URL}/categories`)
        const categories = categoriesResponse.data

        // Map Platzi categories to our categories
        const categoryMapping = {
            'Clothes': 'tops',
            'Electronics': 'accessories',
            'Furniture': 'accessories',
            'Shoes': 'shoes',
            'Others': 'accessories'
        }

        // Fetch clothes (category 1) and shoes (category 4) from Platzi API
        const clothesCategoryIds = [1, 4] // Clothes and Shoes
        let allProducts = []

        for (const catId of clothesCategoryIds) {
            try {
                const response = await axios.get(`${PLATZI_API_URL}/categories/${catId}/products?limit=30`)
                allProducts = allProducts.concat(response.data)
            } catch (err) {
                console.log(`Could not fetch category ${catId}:`, err.message)
            }
        }

        // Also fetch general products
        try {
            const generalResponse = await axios.get(`${PLATZI_API_URL}/products?offset=0&limit=50`)
            allProducts = allProducts.concat(generalResponse.data)
        } catch (err) {
            console.log('Could not fetch general products:', err.message)
        }

        // Remove duplicates by id
        const uniqueProducts = [...new Map(allProducts.map(p => [p.id, p])).values()]

        console.log(`📦 Found ${uniqueProducts.length} products from Platzi API`)

        // Color extraction from title/description
        const extractColor = (text) => {
            const colors = ['White', 'Black', 'Blue', 'Red', 'Green', 'Yellow', 'Navy', 'Grey', 'Brown', 'Pink', 'Purple', 'Orange', 'Beige', 'Cream', 'Multi']
            const lowerText = text.toLowerCase()
            for (const color of colors) {
                if (lowerText.includes(color.toLowerCase())) {
                    return color
                }
            }
            return colors[Math.floor(Math.random() * colors.length)]
        }

        // Size options
        const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '32', '34', '36', '38', '40', '42']

        // Brand options
        const brands = ['Zara', 'H&M', 'Nike', 'Adidas', 'Levis', 'Gap', 'Puma', 'Reebok', 'Tommy Hilfiger', 'Calvin Klein', 'Ralph Lauren', 'Under Armour']

        // Insert products into database
        for (const product of uniqueProducts) {
            try {
                const platziCategory = product.category?.name || 'Others'
                const localCategory = categoryMapping[platziCategory] || 'accessories'
                const subCategory = platziCategory.toLowerCase()
                const color = extractColor(product.title + ' ' + (product.description || ''))
                const size = sizes[Math.floor(Math.random() * sizes.length)]
                const brand = brands[Math.floor(Math.random() * brands.length)]

                // Clean up image URL - replace broken sources with working alternatives
                let imageUrl = product.images?.[0] || ''
                // Fix broken image sources
                if (!imageUrl || imageUrl.includes('placeimg.com') || imageUrl.includes('any.com') || imageUrl.startsWith('[')) {
                    // Use picsum.photos as fallback with product id for consistency
                    imageUrl = `https://picsum.photos/seed/${product.id}/400/400`
                }
                // Clean up Platzi image URLs that might have issues
                if (imageUrl.startsWith('["')) {
                    try {
                        const parsed = JSON.parse(imageUrl.replace(/'/g, '"'))
                        imageUrl = Array.isArray(parsed) ? parsed[0] : imageUrl
                    } catch (e) {
                        imageUrl = `https://picsum.photos/seed/${product.id}/400/400`
                    }
                }

                const originalPrice = Math.round(product.price * 1.2)
                const stockQty = Math.floor(Math.random() * 50) + 10

                await connection.query(
                    `INSERT INTO products (name, description, category, sub_category, price, original_price, image_url, color, size, brand, in_stock, stock_quantity, store_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, 1)`,
                    [
                        product.title,
                        product.description || 'Quality product from our collection',
                        localCategory,
                        subCategory,
                        product.price,
                        originalPrice,
                        imageUrl,
                        color,
                        size,
                        brand,
                        stockQty
                    ]
                )
            } catch (err) {
                console.log(`Could not insert product ${product.title}:`, err.message)
            }
        }

        console.log(`✅ Successfully imported ${uniqueProducts.length} products from Platzi API`)
    } catch (error) {
        console.error('❌ Error fetching from Platzi API:', error.message)
        // Fallback to sample products with real clothing images
        console.log('📦 Using fallback sample products with gender data...')
        await connection.query(`
            INSERT INTO products (name, description, category, sub_category, price, original_price, image_url, color, size, brand, gender, in_stock, stock_quantity, store_id) VALUES
            ('Classic White Shirt', 'Premium cotton formal shirt for men', 'tops', 'shirts', 4500, 5500, 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop', 'White', 'M', 'Arrow', 'men', TRUE, 50, 1),
            ('Blue Denim Jeans', "Men's slim fit denim jeans", 'bottoms', 'jeans', 6500, 7500, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', 'Blue', '32', 'Levis', 'men', TRUE, 30, 1),
            ('Brown Leather Belt', "Men's genuine leather belt", 'accessories', 'belts', 2500, 3000, 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400&h=400&fit=crop', 'Brown', 'L', 'Tommy', 'men', TRUE, 25, 1),
            ('Navy Blazer', "Men's classic navy blue blazer", 'tops', 'blazers', 12000, 15000, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop', 'Navy', 'L', 'Raymond', 'men', TRUE, 15, 1),
            ('Casual Sneakers', 'Comfortable unisex casual sneakers', 'shoes', 'sneakers', 8500, 9500, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', 'White', '42', 'Nike', 'unisex', TRUE, 40, 1),
            ('Floral Summer Dress', "Women's light summer dress with floral print", 'tops', 'dresses', 7500, 8500, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop', 'Multi', 'S', 'Zara', 'women', TRUE, 20, 1),
            ('Khaki Chinos', "Men's casual khaki chino pants", 'bottoms', 'pants', 5500, 6500, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=400&fit=crop', 'Khaki', '34', 'GAP', 'men', TRUE, 35, 1),
            ('Silver Watch', 'Elegant unisex silver wrist watch', 'accessories', 'watches', 15000, 18000, 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop', 'Silver', 'One Size', 'Titan', 'unisex', TRUE, 10, 1),
            ('Black Polo T-Shirt', "Men's cotton polo t-shirt", 'tops', 'tshirts', 3500, 4000, 'https://images.unsplash.com/photo-1598033129183-c4f50c736c89?w=400&h=400&fit=crop', 'Black', 'L', 'US Polo', 'men', TRUE, 45, 1),
            ('Grey Formal Trousers', "Men's slim fit formal trousers", 'bottoms', 'trousers', 4500, 5500, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop', 'Grey', '32', 'Van Heusen', 'men', TRUE, 25, 1),
            ('Leather Loafers', "Men's premium leather loafers", 'shoes', 'formal', 9500, 11000, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=400&fit=crop', 'Brown', '41', 'Clarks', 'men', TRUE, 18, 1),
            ('Cotton Kurta', 'Traditional unisex cotton kurta', 'tops', 'ethnic', 3000, 3500, 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop', 'Cream', 'M', 'FabIndia', 'unisex', TRUE, 30, 1),
            ('White Blouse', "Women's elegant white blouse", 'tops', 'blouses', 4000, 5000, 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&h=400&fit=crop', 'White', 'S', 'H&M', 'women', TRUE, 30, 1),
            ('Black Pencil Skirt', "Women's professional pencil skirt", 'bottoms', 'skirts', 4500, 5500, 'https://images.unsplash.com/photo-1583496661160-fb5886a0afe1?w=400&h=400&fit=crop', 'Black', 'M', 'Zara', 'women', TRUE, 25, 1),
            ('Gold Necklace', "Women's elegant gold necklace", 'accessories', 'jewelry', 15000, 18000, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop', 'Gold', 'One Size', 'Tanishq', 'women', TRUE, 15, 1),
            ('High Heels', "Women's black high heels", 'shoes', 'heels', 6500, 8000, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', 'Black', '38', 'Steve Madden', 'women', TRUE, 20, 1),
            ('Leather Handbag', "Women's brown leather handbag", 'accessories', 'bags', 12000, 15000, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop', 'Brown', 'One Size', 'Gucci', 'women', TRUE, 12, 1),
            ('Pink Cardigan', "Women's cozy pink cardigan", 'tops', 'sweaters', 5500, 6500, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop', 'Pink', 'M', 'H&M', 'women', TRUE, 22, 1)
        `)
    }
}

// Initialize Database Tables
const initializeDatabase = async () => {
    try {
        // First connect without database to create it if needed
        const initPool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '12345678',
            waitForConnections: true,
            connectionLimit: 1
        })

        const initConn = await initPool.getConnection()
        await initConn.query('CREATE DATABASE IF NOT EXISTS minutemax')
        initConn.release()
        await initPool.end()

        // Now use the main pool
        const connection = await pool.getConnection()

        // Users table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role ENUM('customer', 'staff', 'admin') DEFAULT 'customer',
        avatar VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

        // Stores table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        address TEXT,
        location_lat DECIMAL(10, 8),
        location_lng DECIMAL(11, 8),
        qr_code VARCHAR(255),
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

        // Queues table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS queues (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        store_id INT,
        queue_type ENUM('checkout', 'fitting_room') NOT NULL,
token VARCHAR(20),
position INT NOT NULL,
        status ENUM('waiting', 'called', 'completed', 'cancelled') DEFAULT 'waiting',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        notified_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      )
    `)

        // Add notified_at column if it doesn't exist (for existing databases)
        try {
            const [columns] = await connection.query(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'minutemax' AND TABLE_NAME = 'queues' AND COLUMN_NAME = 'notified_at'
            `)
            if (columns.length === 0) {
                await connection.query('ALTER TABLE queues ADD COLUMN notified_at TIMESTAMP NULL')
                console.log('📋 Added notified_at column to queues table')
            }
        } catch (err) {
            // Column already exists or other error - ignore
        }

        // Products table with gender column
        await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        sub_category VARCHAR(100),
        price DECIMAL(10, 2),
        original_price DECIMAL(10, 2),
        image_url VARCHAR(500),
        color VARCHAR(50),
        size VARCHAR(20),
        brand VARCHAR(100),
        gender ENUM('men', 'women', 'unisex') DEFAULT 'unisex',
        in_stock BOOLEAN DEFAULT TRUE,
        stock_quantity INT DEFAULT 0,
        store_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
      )
    `)

        // Add gender column if it doesn't exist (for existing databases)
        try {
            const [columns] = await connection.query(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'minutemax' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'gender'
            `)
            if (columns.length === 0) {
                await connection.query("ALTER TABLE products ADD COLUMN gender ENUM('men', 'women', 'unisex') DEFAULT 'unisex'")
                console.log('📋 Added gender column to products table')
            }
        } catch (err) {
            // Column already exists or other error - ignore
        }

        // Outfit matches table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS outfit_matches (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        uploaded_image VARCHAR(500),
        detected_colors JSON,
        detected_style JSON,
        matched_products JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

        // Favorites table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        product_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_favorite (user_id, product_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `)

        // Queue history table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS queue_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        store_id INT,
        store_name VARCHAR(100),
        queue_type VARCHAR(50),
        wait_time INT,
        joined_at TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

        // Insert single store if none exist (MinuteMax Fashion Store)
        const [stores] = await connection.query('SELECT COUNT(*) as count FROM stores')
        if (stores[0].count === 0) {
            await connection.query(`
        INSERT INTO stores (id, name, address, location_lat, location_lng, image_url) VALUES
        (1, 'MinuteMax Fashion Store', 'No. 123, Main Street, Colombo 03', 6.9147, 79.8585, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400')
      `)
        }

        // ========================
        // SEED ADMIN AND STAFF ACCOUNTS
        // ========================
        const adminEmail = 'admin@minutemax.com'
        const staffEmail = 'staff@minutemax.com'

        // Check if admin exists
        const [adminExists] = await connection.query('SELECT id FROM users WHERE email = ?', [adminEmail])
        if (adminExists.length === 0) {
            const adminPassword = await bcrypt.hash('Admin@123', 10)
            await connection.query(`
                INSERT INTO users (name, email, phone, password, role) VALUES
                (?, ?, ?, ?, ?)
            `, ['Admin User', adminEmail, '+94771234567', adminPassword, 'admin'])
            console.log('👤 Admin account created: admin@minutemax.com / Admin@123')
        }

        // Check if staff exists
        const [staffExists] = await connection.query('SELECT id FROM users WHERE email = ?', [staffEmail])
        if (staffExists.length === 0) {
            const staffPassword = await bcrypt.hash('Staff@123', 10)
            await connection.query(`
                INSERT INTO users (name, email, phone, password, role) VALUES
                (?, ?, ?, ?, ?)
            `, ['Staff Member', staffEmail, '+94779876543', staffPassword, 'staff'])
            console.log('👤 Staff account created: staff@minutemax.com / Staff@123')
        }
        // ========================

        // Fetch and insert products from Platzi Fake Store API
        const [products] = await connection.query('SELECT COUNT(*) as count FROM products')
        if (products[0].count === 0) {
            console.log('📦 Fetching products from Platzi Fake Store API...')
            await fetchAndStoreProducts(connection)
        }

        connection.release()
        console.log('✅ Database initialized successfully with sample data')
    } catch (error) {
        console.error('❌ Database initialization error:', error.message)
        console.log('💡 Make sure MySQL is running and credentials are correct')
    }
}

// Auth Middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]
        if (!token) {
            return res.status(401).json({ error: 'No token provided' })
        }

        const decoded = jwt.verify(token, JWT_SECRET)
        req.userId = decoded.userId
        next()
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' })
    }
}

// Optional Auth Middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]
        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET)
            req.userId = decoded.userId
        }
        next()
    } catch (error) {
        next()
    }
}

// ========================
// AUTH ROUTES
// ========================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, phone || null]
        )

        const token = jwt.sign({ userId: result.insertId }, JWT_SECRET, { expiresIn: '7d' })

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: result.insertId, name, email, role: 'customer' }
        })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' })
        }
        console.error('Registration error:', error)
        res.status(500).json({ error: 'Registration failed' })
    }
})

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' })
        }

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email])

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        const user = users[0]
        const isValid = await bcrypt.compare(password, user.password)

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ error: 'Login failed' })
    }
})

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, phone, role, avatar, created_at FROM users WHERE id = ?',
            [req.userId]
        )

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' })
        }

        res.json(users[0])
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user' })
    }
})

// Update user profile
app.put('/api/auth/profile', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        const { name, phone } = req.body
        const updates = []
        const values = []

        if (name) {
            updates.push('name = ?')
            values.push(name)
        }
        if (phone) {
            updates.push('phone = ?')
            values.push(phone)
        }
        if (req.file) {
            updates.push('avatar = ?')
            values.push(`/uploads/${req.file.filename}`)
        }

        if (updates.length > 0) {
            values.push(req.userId)
            await pool.query(
                `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                values
            )
        }

        const [users] = await pool.query(
            'SELECT id, name, email, phone, role, avatar FROM users WHERE id = ?',
            [req.userId]
        )

        res.json({ message: 'Profile updated', user: users[0] })
    } catch (error) {
        console.error('Profile update error:', error)
        res.status(500).json({ error: 'Failed to update profile' })
    }
})

// ========================
// STORE ROUTES
// ========================

// Get all stores (returns single store for this system)
app.get('/api/stores', async (req, res) => {
    try {
        const [stores] = await pool.query(`
      SELECT s.*,
        (SELECT COUNT(*) FROM queues WHERE store_id = s.id AND status = 'waiting' AND queue_type = 'checkout') as checkout_queue,
        (SELECT COUNT(*) FROM queues WHERE store_id = s.id AND status = 'waiting' AND queue_type = 'fitting_room') as fitting_queue
      FROM stores s
    `)
        res.json(stores)
    } catch (error) {
        console.error('Stores error:', error)
        res.status(500).json({ error: 'Failed to fetch stores' })
    }
})

// Get the single store (for single-shop system)
app.get('/api/store', async (req, res) => {
    try {
        const [stores] = await pool.query(`
      SELECT s.*,
        (SELECT COUNT(*) FROM queues WHERE store_id = s.id AND status = 'waiting' AND queue_type = 'checkout') as cashier_queue,
        (SELECT COUNT(*) FROM queues WHERE store_id = s.id AND status = 'waiting' AND queue_type = 'fitting_room') as fitting_queue
      FROM stores s
      WHERE s.id = 1
    `)
        if (stores.length === 0) {
            return res.status(404).json({ error: 'Store not found' })
        }
        res.json(stores[0])
    } catch (error) {
        console.error('Store error:', error)
        res.status(500).json({ error: 'Failed to fetch store' })
    }
})

// Get single store by ID
app.get('/api/stores/:id', async (req, res) => {
    try {
        const [stores] = await pool.query('SELECT * FROM stores WHERE id = ?', [req.params.id])
        if (stores.length === 0) {
            return res.status(404).json({ error: 'Store not found' })
        }
        res.json(stores[0])
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch store' })
    }
})

// ========================
// QUEUE ROUTES (Single Store)
// ========================
app.get('/api/queue/status/:queueId', async (req, res) => {
    try {
        const [queue] = await pool.query(
            'SELECT * FROM queues WHERE id = ? AND status = "waiting"',
            [req.params.queueId]
        )
        if (queue.length === 0) {
            return res.json({ status: 'not_found' })
        }

        const [ahead] = await pool.query(
            'SELECT COUNT(*) as count FROM queues WHERE store_id = ? AND queue_type = ? AND status = "waiting" AND position < ?',
            [queue[0].store_id, queue[0].queue_type, queue[0].position]
        )

        const [total] = await pool.query(
    'SELECT COUNT(*) as count FROM queues WHERE store_id = ? AND queue_type = ? AND status = "waiting"',
    [queue[0].store_id, queue[0].queue_type]
)
res.json({
    status: 'waiting',
    position: ahead[0].count + 1,
    totalInQueue: total[0].count,
    estimatedWait: (ahead[0].count + 1) * (queue[0].queue_type === 'checkout' ? 3 : 8)
})
    } catch (error) {
        res.status(500).json({ error: 'Failed to get queue status' })
    }
})
// Get current queue status (single store)
app.get('/api/queue/status', async (req, res) => {
    try {
        const storeId = 1 // Single store

        const [queues] = await pool.query(`
      SELECT q.*, u.name as user_name, u.phone as user_phone
      FROM queues q
      LEFT JOIN users u ON q.user_id = u.id
      WHERE q.store_id = ? AND q.status = 'waiting'
      ORDER BY q.position
    `, [storeId])

        const cashierQueue = queues.filter(q => q.queue_type === 'checkout')
        const fittingQueue = queues.filter(q => q.queue_type === 'fitting_room')

        res.json({
            cashier: {
                count: cashierQueue.length,
                estimatedWait: cashierQueue.length * 3,
                queue: cashierQueue
            },
            fitting_room: {
                count: fittingQueue.length,
                estimatedWait: fittingQueue.length * 8,
                queue: fittingQueue
            }
        })
    } catch (error) {
        console.error('Queue status error:', error)
        res.status(500).json({ error: 'Failed to fetch queue status' })
    }
})

// Join queue (single store - no storeId required)
app.post('/api/queue/join', optionalAuth, async (req, res) => {
    try {
        // 👉 ADD osPlayerId HERE
        const { queueType, customerName, customerPhone, osPlayerId } = req.body
        const storeId = 1 
        const userId = req.userId || null

        if (!queueType) {
            return res.status(400).json({ error: 'Queue type is required (fitting_room or checkout)' })
        }

        // Check if user is already in a queue (if authenticated)
if (userId) {
    const [existing] = await pool.query(
        'SELECT * FROM queues WHERE user_id = ? AND status = "waiting"',
        [userId]
    )
    if (existing.length > 0) {
        return res.status(400).json({ error: 'Already in a queue', currentQueue: existing[0] })
    }
} else {
    // Guest check - use queueId from request body
    const { guestQueueId } = req.body
    if (guestQueueId) {
        const [existing] = await pool.query(
            'SELECT * FROM queues WHERE id = ? AND status = "waiting"',
            [guestQueueId]
        )
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already in a queue', currentQueue: existing[0] })
        }
    }
}

        // Get current position
       const [lastPosition] = await pool.query(
            'SELECT MAX(position) as maxPos FROM queues WHERE store_id = ? AND queue_type = ? AND status = "waiting"',
            [storeId, queueType]
        )

        const position = (lastPosition[0].maxPos || 0) + 1
        const estimatedWait = position * (queueType === 'checkout' ? 3 : 8)
        const prefix = queueType === 'fitting_room' ? 'F' : 'C'
        const tokenNumber = `${prefix}${String(position).padStart(3, '0')}`

const [result] = await pool.query(
            'INSERT INTO queues (user_id, store_id, queue_type, position, token, os_player_id) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, storeId, queueType, position, tokenNumber, osPlayerId || null]
        )

// Calculate actual position (people actually waiting ahead)
const [ahead] = await pool.query(
    'SELECT COUNT(*) as count FROM queues WHERE store_id = ? AND queue_type = ? AND status = "waiting" AND id != ?',
    [storeId, queueType, result.insertId]
)

const actualPosition = ahead[0].count + 1

res.status(201).json({
    success: true,
    message: 'Joined queue successfully',
    queue: {
        id: result.insertId,
        token: tokenNumber,
        queue_type: queueType,
        position: actualPosition,
        estimatedWait: actualPosition * (queueType === 'checkout' ? 3 : 8),
        peopleAhead: ahead[0].count
    }
})
    } catch (error) {
        console.error('Join queue error:', error)
        res.status(500).json({ error: 'Failed to join queue' })
    }
})

// Call next customer (Staff action)
app.post('/api/queue/call-next', async (req, res) => {
    try {
        const { queueType } = req.body
        const storeId = 1 // Single store

        if (!queueType) {
            return res.status(400).json({ error: 'Queue type is required' })
        }

        // Get the first person in queue
        const [firstInQueue] = await pool.query(`
      SELECT q.*, u.name as user_name, u.phone as user_phone
      FROM queues q
      LEFT JOIN users u ON q.user_id = u.id
      WHERE q.store_id = ? AND q.queue_type = ? AND q.status = 'waiting'
      ORDER BY q.position LIMIT 1
    `, [storeId, queueType])

        if (firstInQueue.length === 0) {
            return res.json({ success: true, message: 'Queue is empty', customer: null })
        }

        const customer = firstInQueue[0]

        // Mark as called
        await pool.query(
            'UPDATE queues SET status = "called" WHERE id = ?',
            [customer.id]
        )

        // Get updated queue count
        const [remaining] = await pool.query(
            'SELECT COUNT(*) as count FROM queues WHERE store_id = ? AND queue_type = ? AND status = "waiting"',
            [storeId, queueType]
        )

        res.json({
            success: true,
            message: 'Next customer called',
            customer: {
                id: customer.id,
                name: customer.user_name || 'Guest',
                phone: customer.user_phone,
                position: customer.position
            },
            remainingInQueue: remaining[0].count
        })
    } catch (error) {
        console.error('Call next error:', error)
        res.status(500).json({ error: 'Failed to call next customer' })
    }
})

// Complete service (Staff action after serving customer)
app.post('/api/queue/complete', async (req, res) => {
    try {
        const { queueId } = req.body

        await pool.query(
            'UPDATE queues SET status = "completed", completed_at = NOW() WHERE id = ?',
            [queueId]
        )

        res.json({ success: true, message: 'Service completed' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to complete service' })
    }
})

// ========================
// LEGACY QUEUE ROUTES (for backward compatibility)
// Get user's queue status
app.get('/api/queues/my-status', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId

        const [queues] = await pool.query(`
      SELECT q.*, s.name as store_name, s.address as store_address
      FROM queues q
      JOIN stores s ON q.store_id = s.id
      WHERE q.user_id = ? AND q.status = 'waiting'
    `, [userId])

        if (queues.length === 0) {
            return res.json({ inQueue: false })
        }

        const currentQueue = queues[0]

        // Get current position (how many people ahead)
        const [ahead] = await pool.query(
            'SELECT COUNT(*) as count FROM queues WHERE store_id = ? AND queue_type = ? AND status = "waiting" AND position < ?',
            [currentQueue.store_id, currentQueue.queue_type, currentQueue.position]
        )

        const actualPosition = ahead[0].count + 1
        const estimatedWait = actualPosition * (currentQueue.queue_type === 'checkout' ? 3 : 8)

        const [total] = await pool.query(
    'SELECT COUNT(*) as count FROM queues WHERE store_id = ? AND queue_type = ? AND status = "waiting"',
    [currentQueue.store_id, currentQueue.queue_type]
)

res.json({
    inQueue: true,
    queue: {
        ...currentQueue,
        position: actualPosition,
        estimatedWait,
        peopleAhead: ahead[0].count,
        totalInQueue: total[0].count
    }
})
    } catch (error) {
        console.error('Queue status error:', error)
        res.status(500).json({ error: 'Failed to get queue status' })
    }
})
// Get queue status for a store
app.get('/api/queues/:storeId', async (req, res) => {
    try {
        const { storeId } = req.params

        const [queues] = await pool.query(`
      SELECT q.*, u.name as user_name
      FROM queues q
      LEFT JOIN users u ON q.user_id = u.id
      WHERE q.store_id = ? AND q.status = 'waiting'
      ORDER BY q.position
    `, [storeId])

        const checkoutQueue = queues.filter(q => q.queue_type === 'checkout')
        const fittingQueue = queues.filter(q => q.queue_type === 'fitting_room')

        res.json({
            checkout: {
                count: checkoutQueue.length,
                estimatedWait: checkoutQueue.length * 3,
                queue: checkoutQueue
            },
            fitting_room: {
                count: fittingQueue.length,
                estimatedWait: fittingQueue.length * 8,
                queue: fittingQueue
            }
        })
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch queue' })
    }
})

// Join queue
app.post('/api/queues/join', authMiddleware, async (req, res) => {
    try {
        const { storeId, queueType } = req.body
        const userId = req.userId

        if (!storeId || !queueType) {
            return res.status(400).json({ error: 'Store ID and queue type are required' })
        }

        // Check if user is already in a queue
        const [existing] = await pool.query(
            'SELECT * FROM queues WHERE user_id = ? AND status = "waiting"',
            [userId]
        )

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already in a queue', currentQueue: existing[0] })
        }

        // Get current position
        const [lastPosition] = await pool.query(
            'SELECT MAX(position) as maxPos FROM queues WHERE store_id = ? AND queue_type = ? AND status = "waiting"',
            [storeId, queueType]
        )

        const position = (lastPosition[0].maxPos || 0) + 1
const estimatedWait = position * (queueType === 'checkout' ? 3 : 8)
const prefix = queueType === 'fitting_room' ? 'F' : 'C'
const tokenNumber = `${prefix}${String(position).padStart(3, '0')}`

const [result] = await pool.query(
    'INSERT INTO queues (user_id, store_id, queue_type, position, token) VALUES (?, ?, ?, ?, ?)',
    [userId, storeId, queueType, position, tokenNumber]
)

        // Get store name
        const [stores] = await pool.query('SELECT name FROM stores WHERE id = ?', [storeId])

        res.status(201).json({
            message: 'Joined queue successfully',
            queue: {
                id: result.insertId,
                store_id: storeId,
                store_name: stores[0]?.name,
                queue_type: queueType,
                position,
                estimatedWait
            }
        })
    } catch (error) {
        console.error('Join queue error:', error)
        res.status(500).json({ error: 'Failed to join queue' })
    }
})

// Leave queue
app.post('/api/queues/leave', optionalAuth, async (req, res) => {
    try {
        const userId = req.userId || null
        const { queueId } = req.body  // frontend must send this for guests

        if (userId) {
            await pool.query(
                'UPDATE queues SET status = "left" WHERE user_id = ? AND status = "waiting"',
                [userId]
            )
        } else if (queueId) {
            await pool.query(
                'UPDATE queues SET status = "left" WHERE id = ? AND status = "waiting"',
                [queueId]
            )
        }

        res.json({ success: true, message: 'Left queue successfully' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to leave queue' })
    }
})



// Get queue history
app.get('/api/queues/history', authMiddleware, async (req, res) => {
    try {
        const [history] = await pool.query(`
      SELECT q.*, s.name as store_name
      FROM queues q
      JOIN stores s ON q.store_id = s.id
      WHERE q.user_id = ? AND q.status IN ('completed', 'cancelled')
      ORDER BY q.joined_at DESC
      LIMIT 20
    `, [req.userId])

        res.json(history)
    } catch (error) {
        res.status(500).json({ error: 'Failed to get queue history' })
    }
})

// Advance queue (admin/staff)
app.post('/api/queues/advance/:storeId/:queueType', async (req, res) => {
    try {
        const { storeId, queueType } = req.params

        // Get the first person in queue
        const [firstInQueue] = await pool.query(`
      SELECT * FROM queues
      WHERE store_id = ? AND queue_type = ? AND status = 'waiting'
      ORDER BY position LIMIT 1
    `, [storeId, queueType])

        if (firstInQueue.length === 0) {
            return res.json({ message: 'Queue is empty' })
        }

        // Mark as completed
        await pool.query(
            'UPDATE queues SET status = "completed", completed_at = NOW() WHERE id = ?',
            [firstInQueue[0].id]
        )

        res.json({
            message: 'Queue advanced',
            completed: firstInQueue[0]
        })
    } catch (error) {
        res.status(500).json({ error: 'Failed to advance queue' })
    }
})

// ========================
// PRODUCTS ROUTES
// ========================

// Get all products with filters
app.get('/api/products', async (req, res) => {
    try {
        const { category, color, minPrice, maxPrice, search, limit = 50, offset = 0 } = req.query

        let query = 'SELECT * FROM products WHERE in_stock = TRUE'
        const params = []

        if (category && category !== 'all') {
            query += ' AND category = ?'
            params.push(category)
        }

        if (color) {
            query += ' AND color = ?'
            params.push(color)
        }

        if (minPrice) {
            query += ' AND price >= ?'
            params.push(parseFloat(minPrice))
        }

        if (maxPrice) {
            query += ' AND price <= ?'
            params.push(parseFloat(maxPrice))
        }

        if (search) {
            query += ' AND (name LIKE ? OR description LIKE ? OR brand LIKE ?)'
            const searchTerm = `%${search}%`
            params.push(searchTerm, searchTerm, searchTerm)
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        params.push(parseInt(limit), parseInt(offset))

        const [products] = await pool.query(query, params)

        // Get total count
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM products WHERE in_stock = TRUE')

        res.json({
            products,
            total: countResult[0].total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        })
    } catch (error) {
        console.error('Products error:', error)
        res.status(500).json({ error: 'Failed to fetch products' })
    }
})

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id])
        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' })
        }
        res.json(products[0])
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' })
    }
})

// Get product categories
app.get('/api/products/categories/list', async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL')
        res.json(categories.map(c => c.category))
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' })
    }
})

// ========================
// AI OUTFIT MATCHING ROUTES
// ========================

// Color wheel for complementary color matching
const colorWheel = {
    'White': ['Black', 'Navy', 'Blue', 'Grey', 'Red', 'Pink'],
    'Black': ['White', 'Red', 'Pink', 'Yellow', 'Grey', 'Cream'],
    'Blue': ['White', 'Cream', 'Brown', 'Orange', 'Grey', 'Beige'],
    'Navy': ['White', 'Cream', 'Beige', 'Pink', 'Yellow', 'Grey'],
    'Red': ['White', 'Black', 'Cream', 'Navy', 'Grey', 'Beige'],
    'Green': ['White', 'Brown', 'Beige', 'Cream', 'Black', 'Grey'],
    'Yellow': ['Black', 'Navy', 'Grey', 'Purple', 'Blue', 'White'],
    'Grey': ['White', 'Black', 'Pink', 'Blue', 'Navy', 'Red'],
    'Brown': ['White', 'Cream', 'Beige', 'Blue', 'Green', 'Orange'],
    'Pink': ['White', 'Grey', 'Navy', 'Black', 'Cream', 'Blue'],
    'Purple': ['White', 'Yellow', 'Grey', 'Black', 'Cream', 'Pink'],
    'Orange': ['White', 'Navy', 'Blue', 'Brown', 'Cream', 'Black'],
    'Beige': ['Navy', 'Brown', 'White', 'Black', 'Blue', 'Green'],
    'Cream': ['Navy', 'Brown', 'Black', 'Blue', 'Red', 'Green']
}

// Style occasion mapping
const styleOccasions = {
    'Casual': ['Daily Wear', 'Weekend', 'Shopping', 'Coffee Date'],
    'Formal': ['Office', 'Business Meeting', 'Interview', 'Conference'],
    'Smart Casual': ['Dinner Date', 'Office Casual', 'Brunch', 'Gallery'],
    'Streetwear': ['Urban', 'Concert', 'Festival', 'Night Out'],
    'Sporty': ['Gym', 'Outdoor Activity', 'Sports Event', 'Active Day'],
    'Elegant': ['Wedding', 'Gala', 'Fine Dining', 'Theatre'],
    'Bohemian': ['Beach', 'Vacation', 'Festival', 'Art Show'],
    'Classic': ['Any Occasion', 'Timeless Look', 'Versatile', 'Professional']
}

// ========================================
// GENDER DETECTION SIMULATION
// In production: Use a trained ML model or cloud API
// ========================================
const genderKeywords = {
    men: ['man', 'boy', 'male', 'gentleman', 'guy', 'men', 'masculine', 'beard', 'mustache'],
    women: ['woman', 'girl', 'female', 'lady', 'women', 'feminine', 'dress', 'skirt', 'heels']
}

// Upload image and get REAL AI outfit recommendations using Gemini 1.5 Flash
app.post('/api/outfit-match', optionalAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' })
        }

        const imagePath = req.file.path
        const imageUrl = `/uploads/${req.file.filename}`
        const { occasion, bodyType, skinTone, gender: userSpecifiedGender } = req.body || {}

        console.log(`🤖 Sending image to Gemini Vision API...`);
        
        // 1. Initialize Gemini Model
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", // 👈 The absolute smartest model available
            generationConfig: { responseMimeType: "application/json" }
        });

        // 2. Convert the uploaded image into a format Gemini can read
        const imagePart = {
            inlineData: {
                data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
                mimeType: req.file.mimetype
            }
        };

        // 3. The Prompt - Telling the AI exactly how to act
        // 3. The Prompt - Telling the AI exactly how to act
        const prompt = `You are an expert fashion stylist AI. Analyze this clothing image. 
        Provide the following details in a strict JSON format:
        - "detectedCategory": strictly one of "tops", "bottoms", "shoes", "accessories", or "full-body".
        - "detectedGender": strictly "men", "women", or "unisex".
        - "genderConfidence": a number between 1 and 100.
        - "primaryColor": the dominant color (e.g., "Black", "Blue", "White", "Red", "Green", "Yellow", "Grey", "Brown", "Pink", "Purple", "Orange", "Beige", "Cream").
        - "detectedColors": an array of up to 3 colors seen in the item.
        - "detectedStyles": an array of 2 style categories (e.g., "Casual", "Formal", "Smart Casual", "Streetwear", "Sporty", "Elegant", "Bohemian", "Classic").
        - "suggestedOccasions": an array of 2-3 suitable occasions (e.g., "Daily Wear", "Office", "Dinner Date", "Gym").
        - "confidence": overall confidence score between 1 and 100.
        Return ONLY valid JSON.`;

        // 4. Wait for the AI to analyze the actual pixels!
        const aiResponse = await model.generateContent([prompt, imagePart]);
        const aiData = JSON.parse(aiResponse.response.text());
        
        console.log(`✅ Gemini Analysis Complete:`, aiData);

        // 5. Extract the REAL data from the AI
        const uploadedCategory = aiData.detectedCategory || 'tops'; // 👈 ADDED THIS LINE
        const detectedGender = userSpecifiedGender || aiData.detectedGender || 'unisex';
        const genderConfidence = userSpecifiedGender ? 100 : (aiData.genderConfidence || 85);
        const primaryColor = aiData.primaryColor || 'Black';
        const detectedColors = aiData.detectedColors || [primaryColor];
        const detectedStyles = aiData.detectedStyles || ['Casual'];
        const suggestedOccasions = aiData.suggestedOccasions || ['Daily Wear'];
        const confidence = aiData.confidence || 90;

        // Color wheel logic for complementary color matching
        const colorWheel = {
            'White': ['Black', 'Navy', 'Blue', 'Grey', 'Red', 'Pink'],
            'Black': ['White', 'Red', 'Pink', 'Yellow', 'Grey', 'Cream'],
            'Blue': ['White', 'Cream', 'Brown', 'Orange', 'Grey', 'Beige'],
            'Navy': ['White', 'Cream', 'Beige', 'Pink', 'Yellow', 'Grey'],
            'Red': ['White', 'Black', 'Cream', 'Navy', 'Grey', 'Beige'],
            'Green': ['White', 'Brown', 'Beige', 'Cream', 'Black', 'Grey'],
            'Yellow': ['Black', 'Navy', 'Grey', 'Purple', 'Blue', 'White'],
            'Grey': ['White', 'Black', 'Pink', 'Blue', 'Navy', 'Red'],
            'Brown': ['White', 'Cream', 'Beige', 'Blue', 'Green', 'Orange'],
            'Pink': ['White', 'Grey', 'Navy', 'Black', 'Cream', 'Blue'],
            'Purple': ['White', 'Yellow', 'Grey', 'Black', 'Cream', 'Pink'],
            'Orange': ['White', 'Navy', 'Blue', 'Brown', 'Cream', 'Black'],
            'Beige': ['Navy', 'Brown', 'White', 'Black', 'Blue', 'Green'],
            'Cream': ['Navy', 'Brown', 'Black', 'Blue', 'Red', 'Green']
        }

        const complementaryColors = colorWheel[primaryColor] || ['White', 'Black', 'Grey'];

        // Build smart matching query based on REAL AI visual data
        const allMatchColors = [...detectedColors, ...complementaryColors.slice(0, 3)]
        const colorConditions = allMatchColors.map(c => `color LIKE '%${c}%'`).join(' OR ')

        // Get products from your database that match what the AI saw
        // Get products from your database that match what the AI saw
        const [products] = await pool.query(`
            SELECT p.*,
                CASE
                    WHEN p.category = ? THEN FLOOR(40 + RAND() * 10)
                    WHEN color IN (${detectedColors.map(c => `'${c}'`).join(',')}) THEN FLOOR(92 + RAND() * 8)
                    WHEN ${colorConditions} THEN FLOOR(82 + RAND() * 12)
                    ELSE FLOOR(70 + RAND() * 15)
                END as match_score,
                CASE
                    WHEN p.category = ? THEN 'Alternative Option'
                    WHEN color IN (${detectedColors.map(c => `'${c}'`).join(',')}) THEN 'Perfect Color Match'
                    WHEN ${colorConditions} THEN 'Complementary Color'
                    ELSE 'Style Complement'
                END as match_reason
            FROM products p
            WHERE p.in_stock = TRUE
              AND (p.gender = ? OR p.gender = 'unisex')
            ORDER BY
                CASE WHEN p.category = ? THEN 1 ELSE 0 END,
                CASE WHEN p.gender = ? THEN 0 ELSE 1 END,
                CASE WHEN color IN (${detectedColors.map(c => `'${c}'`).join(',')}) THEN 0
                     WHEN ${colorConditions} THEN 1
                     ELSE 2 END,
                RAND()
            LIMIT 12
        `, [uploadedCategory, uploadedCategory, detectedGender, uploadedCategory, detectedGender])

        const outfitSuggestion = {
            tops: products.filter(p => p.category === 'tops').slice(0, 3),
            bottoms: products.filter(p => p.category === 'bottoms').slice(0, 2),
            shoes: products.filter(p => p.category === 'shoes').slice(0, 2),
            accessories: products.filter(p => p.category === 'accessories').slice(0, 3)
        }

        products.sort((a, b) => b.match_score - a.match_score)

        // Save to database
        let matchId = null
        if (req.userId) {
            const [result] = await pool.query(
                `INSERT INTO outfit_matches (user_id, uploaded_image, detected_colors, detected_style, detected_gender, matched_products)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    req.userId,
                    imageUrl,
                    JSON.stringify(detectedColors),
                    JSON.stringify(detectedStyles),
                    detectedGender,
                    JSON.stringify(products.map(p => p.id))
                ]
            )
            matchId = result.insertId
        }

        res.json({
            success: true,
            matchId,
            uploadedImage: imageUrl,
            analysis: {
                detectedGender,
                genderConfidence,
                detectedColors,
                detectedStyles,
                suggestedOccasions,
                complementaryColors: complementaryColors.slice(0, 4),
                confidence,
                personalization: {
                    occasion: occasion || 'Any',
                    bodyType: bodyType || 'Not specified',
                    skinTone: skinTone || 'Not specified'
                }
            },
            outfitSuggestion,
            recommendations: products,
            totalMatches: products.length,
            instantComplements: products.slice(0, 5).map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                matchScore: p.match_score,
                reason: p.match_reason
            }))
        })
    } catch (error) {
        console.error('Outfit match error:', error)
        res.status(500).json({ error: 'Failed to process outfit match' })
    }
})

// Get user's outfit match history
app.get('/api/outfit-match/history', authMiddleware, async (req, res) => {
    try {
        const [matches] = await pool.query(`
      SELECT * FROM outfit_matches
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.userId])

        res.json(matches)
    } catch (error) {
        res.status(500).json({ error: 'Failed to get match history' })
    }
})

// ========================
// FAVORITES ROUTES
// ========================

// Get user favorites
app.get('/api/favorites', authMiddleware, async (req, res) => {
    try {
        const [favorites] = await pool.query(`
      SELECT p.*, f.created_at as favorited_at
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [req.userId])

        res.json(favorites)
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch favorites' })
    }
})

// Add to favorites
app.post('/api/favorites', authMiddleware, async (req, res) => {
    try {
        const { productId } = req.body

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' })
        }

        await pool.query(
            'INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)',
            [req.userId, productId]
        )

        res.status(201).json({ message: 'Added to favorites', productId })
    } catch (error) {
        console.error('Add favorite error:', error)
        res.status(500).json({ error: 'Failed to add favorite' })
    }
})

// Remove from favorites
app.delete('/api/favorites/:productId', authMiddleware, async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
            [req.userId, req.params.productId]
        )

        res.json({
            message: 'Removed from favorites',
            removed: result.affectedRows > 0
        })
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove favorite' })
    }
})

// Check if product is favorited
app.get('/api/favorites/check/:productId', authMiddleware, async (req, res) => {
    try {
        const [result] = await pool.query(
            'SELECT id FROM favorites WHERE user_id = ? AND product_id = ?',
            [req.userId, req.params.productId]
        )

        res.json({ isFavorited: result.length > 0 })
    } catch (error) {
        res.status(500).json({ error: 'Failed to check favorite' })
    }
})

// ========================
// ADMIN ROUTES
// ========================

// Get dashboard stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [usersCount] = await pool.query('SELECT COUNT(*) as count FROM users')
        const [queuesCount] = await pool.query('SELECT COUNT(*) as count FROM queues WHERE status = "waiting"')
        const [productsCount] = await pool.query('SELECT COUNT(*) as count FROM products WHERE in_stock = TRUE')
        const [storesCount] = await pool.query('SELECT COUNT(*) as count FROM stores')
        const [todayQueues] = await pool.query(
            'SELECT COUNT(*) as count FROM queues WHERE DATE(joined_at) = CURDATE()'
        )
        const [completedToday] = await pool.query(
            'SELECT COUNT(*) as count FROM queues WHERE DATE(completed_at) = CURDATE() AND status = "completed"'
        )

        res.json({
            users: usersCount[0].count,
            activeQueues: queuesCount[0].count,
            products: productsCount[0].count,
            stores: storesCount[0].count,
            todayQueues: todayQueues[0].count,
            completedToday: completedToday[0].count
        })
    } catch (error) {
        console.error('Admin stats error:', error)
        res.status(500).json({ error: 'Failed to get stats' })
    }
})

// Get all users (admin)
app.get('/api/admin/users', async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC'
        )
        res.json(users)
    } catch (error) {
        res.status(500).json({ error: 'Failed to get users' })
    }
})

// Clear all queues (admin action)
app.post('/api/admin/clear-queues', async (req, res) => {
    try {
        const { queueType } = req.body

        if (queueType) {
            await pool.query(
                'UPDATE queues SET status = "completed", completed_at = NOW() WHERE status = "waiting" AND queue_type = ?',
                [queueType]
            )
        } else {
            await pool.query(
                'UPDATE queues SET status = "completed", completed_at = NOW() WHERE status = "waiting"'
            )
        }

        res.json({ success: true, message: 'Queue cleared successfully' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear queue' })
    }
})

// Send OneSignal push notification
app.post('/api/notify/queue', async (req, res) => {
    try {
        const { playerId, title, message, type } = req.body
        
        const response = await axios.post(
            'https://onesignal.com/api/v1/notifications',
            {
                app_id: process.env.ONESIGNAL_APP_ID,
                include_subscription_ids: [playerId],
                headings: { en: title },
                contents: { en: message },
                data: { type }
            },
            {
                headers: {
                    Authorization: process.env.ONESIGNAL_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        )
        res.json({ success: true, result: response.data })
    } catch (error) {
        console.error('OneSignal error:', error.message)
        res.status(500).json({ error: 'Failed to send notification' })
    }
})
// Get all queues (admin)
app.get('/api/admin/queues', async (req, res) => {
    try {
        const { status = 'waiting' } = req.query

        const [queues] = await pool.query(`
      SELECT q.*, u.name as user_name, u.email as user_email, s.name as store_name
      FROM queues q
      LEFT JOIN users u ON q.user_id = u.id
      JOIN stores s ON q.store_id = s.id
      WHERE q.status = ?
      ORDER BY q.joined_at DESC
      LIMIT 100
    `, [status])

        res.json(queues)
    } catch (error) {
        res.status(500).json({ error: 'Failed to get queues' })
    }
})

// Add new product (admin)
app.post('/api/admin/products', upload.single('image'), async (req, res) => {
    try {
        const { name, description, category, sub_category, price, original_price, color, size, brand, stock_quantity, store_id } = req.body

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null

        const [result] = await pool.query(
            `INSERT INTO products (name, description, category, sub_category, price, original_price, image_url, color, size, brand, stock_quantity, store_id, in_stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [name, description, category, sub_category, price, original_price, imageUrl, color, size, brand, stock_quantity || 0, store_id || null]
        )

        res.status(201).json({
            message: 'Product created',
            productId: result.insertId
        })
    } catch (error) {
        console.error('Create product error:', error)
        res.status(500).json({ error: 'Failed to create product' })
    }
})

// Update product (admin)
app.put('/api/admin/products/:id', upload.single('image'), async (req, res) => {
    try {
        const { name, description, category, price, color, size, brand, stock_quantity, in_stock } = req.body

        const updates = []
        const values = []

        if (name) { updates.push('name = ?'); values.push(name) }
        if (description) { updates.push('description = ?'); values.push(description) }
        if (category) { updates.push('category = ?'); values.push(category) }
        if (price) { updates.push('price = ?'); values.push(price) }
        if (color) { updates.push('color = ?'); values.push(color) }
        if (size) { updates.push('size = ?'); values.push(size) }
        if (brand) { updates.push('brand = ?'); values.push(brand) }
        if (stock_quantity !== undefined) { updates.push('stock_quantity = ?'); values.push(stock_quantity) }
        if (in_stock !== undefined) { updates.push('in_stock = ?'); values.push(in_stock === 'true' || in_stock === true) }
        if (req.file) { updates.push('image_url = ?'); values.push(`/uploads/${req.file.filename}`) }

        if (updates.length > 0) {
            values.push(req.params.id)
            await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values)
        }

        res.json({ message: 'Product updated' })
    } catch (error) {
        console.error('Update product error:', error)
        res.status(500).json({ error: 'Failed to update product' })
    }
})

// Delete product (admin)
app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id])
        res.json({ message: 'Product deleted' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' })
    }
})

// ========================
// NOTIFICATION ROUTES
// ========================

// Get notification logs (admin)
app.get('/api/admin/notifications/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 50
    const logs = notificationLogs.slice(-limit).reverse()
    res.json({
        total: notificationLogs.length,
        logs
    })
})

// Test email notification (admin)
app.post('/api/admin/notifications/test', async (req, res) => {
    try {
        const { email, message } = req.body

        if (!email) {
            return res.status(400).json({ error: 'Email address required' })
        }

        const result = await sendEmailNotification(
            email,
            '🧪 MinuteMax Test Notification',
            message || 'This is a test notification from MinuteMax Queue System. If you received this, email notifications are working correctly!'
        )

        res.json({
            success: result.success,
            message: result.success ? 'Test email sent successfully' : 'Failed to send email',
            details: result
        })
    } catch (error) {
        res.status(500).json({ error: 'Failed to send test notification' })
    }
})

// Send manual notification to user in queue (admin)
app.post('/api/admin/notifications/send', async (req, res) => {
    try {
        const { queueId, customMessage } = req.body

        const [queueUser] = await pool.query(`
            SELECT q.*, u.name, u.email, s.name as store_name
            FROM queues q
            JOIN users u ON q.user_id = u.id
            JOIN stores s ON q.store_id = s.id
            WHERE q.id = ?
        `, [queueId])

        if (queueUser.length === 0) {
            return res.status(404).json({ error: 'Queue entry not found' })
        }

        const user = queueUser[0]
        if (!user.email) {
            return res.status(400).json({ error: 'User has no email address' })
        }

        const message = customMessage || `Hi ${user.name}! This is a notification from MinuteMax ${user.store_name}. Your current position in the queue is ${user.position}.`

        const result = await sendEmailNotification(
            user.email,
            '📢 MinuteMax Queue Update',
            message
        )

        if (result.success) {
            await pool.query('UPDATE queues SET notified_at = NOW() WHERE id = ?', [queueId])
        }

        res.json({
            success: result.success,
            message: result.success ? 'Notification sent' : 'Failed to send notification',
            details: result
        })
    } catch (error) {
        res.status(500).json({ error: 'Failed to send notification' })
    }
})

// Get email configuration status (admin)
app.get('/api/admin/notifications/status', (req, res) => {
    res.json({
        configured: emailTransporter !== null,
        config: {
            host: EMAIL_CONFIG.host,
            port: EMAIL_CONFIG.port,
            user: EMAIL_CONFIG.auth.user.replace(/(.{3}).*(@.*)/, '$1***$2') // Mask email
        },
        totalNotifications: notificationLogs.length,
        recentSuccess: notificationLogs.filter(l => l.status === 'sent').length,
        recentFailed: notificationLogs.filter(l => l.status === 'failed').length
    })
})

// ========================
// UTILITY ROUTES
// ========================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'MinuteMax API is running',
        timestamp: new Date().toISOString()
    })
})

// Sync products from Platzi API (admin/utility)
app.post('/api/admin/sync-products', async (req, res) => {
    try {
        const connection = await pool.getConnection()

        // Clear existing products (optional based on query param)
        const { clearExisting } = req.query
        if (clearExisting === 'true') {
            await connection.query('DELETE FROM products')
            console.log('🗑️ Cleared existing products')
        }

        await fetchAndStoreProducts(connection)
        connection.release()

        res.json({ success: true, message: 'Products synced from Platzi API' })
    } catch (error) {
        console.error('Sync error:', error)
        res.status(500).json({ error: 'Failed to sync products' })
    }
})

// Fix broken product images with proper clothing images
app.post('/api/admin/fix-images', async (req, res) => {
    try {
        // Clothing image URLs from Unsplash (free, reliable, actual fashion images)
        const clothingImages = {
            tops: [
                'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop', // shirt
                'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop', // tshirt
                'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop', // hoodie
                'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop', // blouse
                'https://images.unsplash.com/photo-1598033129183-c4f50c736c89?w=400&h=400&fit=crop', // polo
                'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400&h=400&fit=crop', // jacket
                'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop', // coat
                'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400&h=400&fit=crop', // sweater
            ],
            bottoms: [
                'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', // jeans
                'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=400&fit=crop', // pants
                'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop', // trousers
                'https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=400&h=400&fit=crop', // shorts
                'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&h=400&fit=crop', // skirt
            ],
            shoes: [
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', // sneakers
                'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', // running shoes
                'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=400&fit=crop', // boots
                'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', // heels
                'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&h=400&fit=crop', // canvas shoes
            ],
            accessories: [
                'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop', // watch
                'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', // bag
                'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop', // sunglasses
                'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400&h=400&fit=crop', // belt
                'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400&h=400&fit=crop', // jewelry
            ]
        }

        // Get all products
        const [products] = await pool.query('SELECT id, category FROM products')

        let updatedCount = 0
        for (const product of products) {
            const category = product.category || 'tops'
            const images = clothingImages[category] || clothingImages.tops
            const imageUrl = images[product.id % images.length]

            await pool.query('UPDATE products SET image_url = ? WHERE id = ?', [imageUrl, product.id])
            updatedCount++
        }

        console.log(`🖼️ Fixed ${updatedCount} product images with clothing photos`)

        res.json({
            success: true,
            message: `Fixed ${updatedCount} product images with real clothing photos`,
            affectedRows: updatedCount
        })
    } catch (error) {
        console.error('Fix images error:', error)
        res.status(500).json({ error: 'Failed to fix images' })
    }
})

// Get products from external API (proxy endpoint)
app.get('/api/external/products', async (req, res) => {
    try {
        const { limit = 50, offset = 0, categoryId } = req.query
        let url = `${PLATZI_API_URL}/products?limit=${limit}&offset=${offset}`

        if (categoryId) {
            url = `${PLATZI_API_URL}/categories/${categoryId}/products?limit=${limit}&offset=${offset}`
        }

        const response = await axios.get(url)
        res.json(response.data)
    } catch (error) {
        console.error('External API error:', error.message)
        res.status(500).json({ error: 'Failed to fetch from external API' })
    }
})

// Get categories from external API
app.get('/api/external/categories', async (req, res) => {
    try {
        const response = await axios.get(`${PLATZI_API_URL}/categories`)
        res.json(response.data)
    } catch (error) {
        console.error('External API error:', error.message)
        res.status(500).json({ error: 'Failed to fetch categories' })
    }
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err)

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' })
        }
        return res.status(400).json({ error: err.message })
    }

    res.status(500).json({ error: 'Internal server error' })
})

// Start server - bind to 0.0.0.0 to allow network access (for phone QR scanning)
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 MinuteMax API Server                                     ║
║   ══════════════════════                                      ║
║                                                               ║
║   Server running at: http://localhost:${PORT}                   ║
║   Network access:    http://0.0.0.0:${PORT}                     ║
║                                                               ║
║   Endpoints:                                                  ║
║   • POST /api/auth/register - Register new user               ║
║   • POST /api/auth/login - User login                         ║
║   • GET  /api/stores - Get all stores                         ║
║   • GET  /api/queues/:storeId - Get queue status              ║
║   • POST /api/queues/join - Join a queue                      ║
║   • GET  /api/products - Get products                         ║
║   • POST /api/outfit-match - AI outfit matching               ║
║   • GET  /api/favorites - Get user favorites                  ║
║   • GET  /api/admin/stats - Admin dashboard stats             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `)
    //await initializeDatabase()
})

export default app
