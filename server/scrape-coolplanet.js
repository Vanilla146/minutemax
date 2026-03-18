/**
 * CoolPlanet.lk Product Scraper
 * 
 * Scrapes clothing products from CoolPlanet.lk (Shopify store) and imports them into 
 * the MinuteMax MySQL database.
 * 
 * Usage: node scrape-coolplanet.js
 */

import axios from 'axios';
import mysql from 'mysql2/promise';

// Database configuration (same as server.js)
const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '20020224Ha',
    database: 'minutemax'
};

// CoolPlanet.lk Collections to scrape
const COLLECTIONS = [
    // Women's Collections
    { handle: 'womens-new-arrivals', gender: 'women', category: 'tops', subCategory: 'new arrivals' },
    { handle: 'everyday', gender: 'women', category: 'tops', subCategory: 'everyday' },
    { handle: 'night-out', gender: 'women', category: 'tops', subCategory: 'party' },
    { handle: 'essentials', gender: 'women', category: 'tops', subCategory: 'essentials' },
    { handle: 'for-the-occasion', gender: 'women', category: 'tops', subCategory: 'occasion' },

    // Men's Collections
    { handle: 'mens-new-arrivals', gender: 'men', category: 'tops', subCategory: 'new arrivals' },
    { handle: 'everyday-men', gender: 'men', category: 'tops', subCategory: 'everyday' },
    { handle: 'work', gender: 'men', category: 'tops', subCategory: 'work' },
    { handle: 'essentials-1', gender: 'men', category: 'tops', subCategory: 'essentials' },
    { handle: 'for-the-statement', gender: 'men', category: 'tops', subCategory: 'statement' },
];

// Helper to strip HTML tags from description
function stripHtml(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Helper to extract brand from title or vendor
function extractBrand(product) {
    // Check if vendor is set and meaningful
    if (product.vendor && product.vendor !== 'Cool Planet Online') {
        return product.vendor;
    }

    // Try to extract brand from title (usually first word before brand name)
    const title = product.title || '';
    const knownBrands = ['Hada', 'King Street', 'Hustle', 'Andriana', 'HADA'];

    for (const brand of knownBrands) {
        if (title.toLowerCase().includes(brand.toLowerCase())) {
            return brand;
        }
    }

    return 'Cool Planet';
}

// Helper to determine category from product type or tags
function determineCategory(product, defaultCategory) {
    const productType = (product.product_type || '').toLowerCase();
    const tags = (product.tags || []).map(t => typeof t === 'string' ? t.toLowerCase() : '');

    // Map product types to categories
    if (productType.includes('kurta')) return 'tops';
    if (productType.includes('shirt')) return 'tops';
    if (productType.includes('t-shirt')) return 'tops';
    if (productType.includes('blouse')) return 'tops';
    if (productType.includes('top')) return 'tops';
    if (productType.includes('dress')) return 'tops';
    if (productType.includes('skirt')) return 'bottoms';
    if (productType.includes('pant') || productType.includes('trouser')) return 'bottoms';
    if (productType.includes('jeans')) return 'bottoms';
    if (productType.includes('shoe') || productType.includes('footwear')) return 'shoes';
    if (productType.includes('accessory') || productType.includes('bag') || productType.includes('belt')) return 'accessories';

    // Check tags
    if (tags.includes('kurtas')) return 'tops';
    if (tags.includes('shirts')) return 'tops';
    if (tags.includes('dresses')) return 'tops';
    if (tags.includes('pants')) return 'bottoms';
    if (tags.includes('shoes')) return 'shoes';

    return defaultCategory;
}

// Fetch products from a collection
async function fetchCollectionProducts(collectionHandle, limit = 50) {
    try {
        const url = `https://coolplanet.lk/collections/${collectionHandle}/products.json?limit=${limit}`;
        console.log(`📦 Fetching: ${url}`);

        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        return response.data.products || [];
    } catch (error) {
        console.error(`❌ Failed to fetch ${collectionHandle}:`, error.message);
        return [];
    }
}

// Transform Shopify product to MinuteMax format
function transformProduct(shopifyProduct, collectionConfig) {
    // Get primary color from options
    const colorOption = shopifyProduct.options?.find(o => o.name.toLowerCase() === 'color');
    const colors = colorOption?.values || [];
    const primaryColor = colors[0] || 'Multi';

    // Get primary size from options
    const sizeOption = shopifyProduct.options?.find(o => o.name.toLowerCase() === 'size');
    const sizes = sizeOption?.values || [];
    const primarySize = sizes[0] || 'Free Size';

    // Get price from first variant
    const price = shopifyProduct.variants?.[0]?.price ? parseFloat(shopifyProduct.variants[0].price) : 0;
    const compareAtPrice = shopifyProduct.variants?.[0]?.compare_at_price ? parseFloat(shopifyProduct.variants[0].compare_at_price) : null;

    // Get primary image
    const imageUrl = shopifyProduct.images?.[0]?.src || shopifyProduct.image?.src || '';

    // Check availability
    const hasAvailableVariant = shopifyProduct.variants?.some(v => v.available);

    // Build description
    let description = stripHtml(shopifyProduct.body_html);
    if (description.length > 1000) {
        description = description.substring(0, 1000) + '...';
    }

    return {
        name: shopifyProduct.title,
        description: description || `${shopifyProduct.title} from Cool Planet`,
        category: determineCategory(shopifyProduct, collectionConfig.category),
        subCategory: shopifyProduct.product_type || collectionConfig.subCategory,
        price: price,
        originalPrice: compareAtPrice || Math.round(price * 1.15),  // 15% markup if no compare price
        imageUrl: imageUrl,
        color: primaryColor,
        size: primarySize,
        brand: extractBrand(shopifyProduct),
        gender: collectionConfig.gender,
        inStock: hasAvailableVariant !== false,
        stockQuantity: hasAvailableVariant !== false ? 50 : 0,
        shopifyId: shopifyProduct.id,
        allColors: colors.join(', '),
        allSizes: sizes.join(', ')
    };
}

// Insert product into database
async function insertProduct(connection, product) {
    try {
        // Check if product already exists (by shopify ID or name + brand combination)
        const [existing] = await connection.query(
            'SELECT id FROM products WHERE name = ? AND brand = ?',
            [product.name, product.brand]
        );

        if (existing.length > 0) {
            console.log(`⏭️  Skipping duplicate: ${product.name}`);
            return { inserted: false, skipped: true };
        }

        await connection.query(
            `INSERT INTO products (name, description, category, sub_category, price, original_price, image_url, color, size, brand, gender, in_stock, stock_quantity, store_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                product.name,
                product.description,
                product.category,
                product.subCategory,
                product.price,
                product.originalPrice,
                product.imageUrl,
                product.color,
                product.size,
                product.brand,
                product.gender,
                product.inStock,
                product.stockQuantity
            ]
        );

        console.log(`✅ Inserted: ${product.name} (${product.gender}, ${product.price} LKR)`);
        return { inserted: true, skipped: false };
    } catch (error) {
        console.error(`❌ Failed to insert ${product.name}:`, error.message);
        return { inserted: false, skipped: false, error: true };
    }
}

// Main scraping function
async function scrapeAndImport() {
    console.log('🚀 Starting CoolPlanet.lk product scraper...\n');

    let connection;
    try {
        // Connect to database
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('📊 Connected to MySQL database\n');

        const stats = {
            totalFetched: 0,
            inserted: 0,
            skipped: 0,
            errors: 0
        };

        // Process each collection
        for (const collection of COLLECTIONS) {
            console.log(`\n📂 Processing collection: ${collection.handle} (${collection.gender})`);
            console.log('─'.repeat(60));

            const products = await fetchCollectionProducts(collection.handle, 30);
            console.log(`   Found ${products.length} products\n`);

            stats.totalFetched += products.length;

            // Transform and insert each product
            for (const shopifyProduct of products) {
                const transformedProduct = transformProduct(shopifyProduct, collection);
                const result = await insertProduct(connection, transformedProduct);

                if (result.inserted) stats.inserted++;
                if (result.skipped) stats.skipped++;
                if (result.error) stats.errors++;
            }

            // Small delay between collections to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Print summary
        console.log('\n' + '═'.repeat(60));
        console.log('📊 SCRAPING SUMMARY');
        console.log('═'.repeat(60));
        console.log(`   Total products fetched:  ${stats.totalFetched}`);
        console.log(`   Products inserted:       ${stats.inserted}`);
        console.log(`   Duplicates skipped:      ${stats.skipped}`);
        console.log(`   Errors:                  ${stats.errors}`);
        console.log('═'.repeat(60));

        // Show sample of what was added
        const [recentProducts] = await connection.query(
            `SELECT name, brand, gender, price, category FROM products 
             WHERE brand IN ('Hada', 'King Street', 'Hustle', 'Andriana', 'Cool Planet')
             ORDER BY id DESC LIMIT 5`
        );

        if (recentProducts.length > 0) {
            console.log('\n📝 Sample of recently added products:');
            recentProducts.forEach(p => {
                console.log(`   - ${p.name} (${p.brand}, ${p.gender}, Rs. ${p.price})`);
            });
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n📊 Database connection closed');
        }
    }
}

// Run the scraper
scrapeAndImport().then(() => {
    console.log('\n🎉 Scraping complete!');
}).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});
