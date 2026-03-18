import mysql from 'mysql2/promise';

async function addGenderColumn() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '20020224Ha',
        database: 'minutemax'
    });

    try {
        // Check if gender column exists
        const [cols] = await pool.query(`SHOW COLUMNS FROM products LIKE 'gender'`);
        
        if (cols.length === 0) {
            await pool.query(`ALTER TABLE products ADD COLUMN gender ENUM('men', 'women', 'unisex') DEFAULT 'unisex'`);
            console.log('✅ Added gender column to products table');
        } else {
            console.log('ℹ️ Gender column already exists');
        }

        // Delete all existing products to add fresh gender-specific products
        await pool.query('DELETE FROM products');
        console.log('🗑️ Cleared old products');

        // Insert fresh gender-specific products with proper clothing images
        const products = [
            // MEN'S CLOTHING
            { name: "Men's Classic White Shirt", category: 'tops', price: 4500, image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop', color: 'White', gender: 'men', description: 'Classic fit cotton shirt for men' },
            { name: "Men's Navy Blue Polo", category: 'tops', price: 3500, image_url: 'https://images.unsplash.com/photo-1625910513413-5fc42c32eb37?w=400&h=400&fit=crop', color: 'Navy', gender: 'men', description: 'Comfortable polo shirt for casual wear' },
            { name: "Men's Black T-Shirt", category: 'tops', price: 2500, image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', color: 'Black', gender: 'men', description: 'Essential black crew neck tee' },
            { name: "Men's Grey Sweater", category: 'tops', price: 6500, image_url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=400&h=400&fit=crop', color: 'Grey', gender: 'men', description: 'Cozy knit sweater for cool days' },
            { name: "Men's Blue Denim Jeans", category: 'bottoms', price: 7500, image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', color: 'Blue', gender: 'men', description: 'Classic fit denim jeans' },
            { name: "Men's Khaki Chinos", category: 'bottoms', price: 5500, image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=400&fit=crop', color: 'Khaki', gender: 'men', description: 'Slim fit chino pants' },
            { name: "Men's Black Formal Trousers", category: 'bottoms', price: 6000, image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop', color: 'Black', gender: 'men', description: 'Formal dress pants' },
            { name: "Men's White Sneakers", category: 'shoes', price: 8500, image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', color: 'White', gender: 'men', description: 'Clean white casual sneakers' },
            { name: "Men's Brown Leather Shoes", category: 'shoes', price: 12000, image_url: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400&h=400&fit=crop', color: 'Brown', gender: 'men', description: 'Classic oxford leather shoes' },
            { name: "Men's Black Boots", category: 'shoes', price: 15000, image_url: 'https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=400&h=400&fit=crop', color: 'Black', gender: 'men', description: 'Stylish leather boots' },
            { name: "Men's Brown Leather Belt", category: 'accessories', price: 2500, image_url: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400&h=400&fit=crop', color: 'Brown', gender: 'men', description: 'Classic leather belt' },
            { name: "Men's Silver Watch", category: 'accessories', price: 25000, image_url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop', color: 'Silver', gender: 'men', description: 'Elegant stainless steel watch' },
            { name: "Men's Navy Blazer", category: 'tops', price: 18000, image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop', color: 'Navy', gender: 'men', description: 'Smart casual blazer jacket' },

            // WOMEN'S CLOTHING  
            { name: "Women's White Blouse", category: 'tops', price: 4500, image_url: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&h=400&fit=crop', color: 'White', gender: 'women', description: 'Elegant white blouse for women' },
            { name: "Women's Pink Top", category: 'tops', price: 3500, image_url: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400&h=400&fit=crop', color: 'Pink', gender: 'women', description: 'Stylish pink casual top' },
            { name: "Women's Black Dress", category: 'tops', price: 8500, image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop', color: 'Black', gender: 'women', description: 'Little black dress' },
            { name: "Women's Floral Sundress", category: 'tops', price: 6500, image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&h=400&fit=crop', color: 'Multi', gender: 'women', description: 'Beautiful floral summer dress' },
            { name: "Women's Red Blouse", category: 'tops', price: 4000, image_url: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=400&h=400&fit=crop', color: 'Red', gender: 'women', description: 'Elegant red silk blouse' },
            { name: "Women's Blue Jeans", category: 'bottoms', price: 6500, image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop', color: 'Blue', gender: 'women', description: 'High waist skinny jeans' },
            { name: "Women's Black Skirt", category: 'bottoms', price: 4500, image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0afe1?w=400&h=400&fit=crop', color: 'Black', gender: 'women', description: 'Classic pencil skirt' },
            { name: "Women's White Pants", category: 'bottoms', price: 5500, image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop', color: 'White', gender: 'women', description: 'Elegant wide-leg pants' },
            { name: "Women's High Heels", category: 'shoes', price: 9500, image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', color: 'Black', gender: 'women', description: 'Classic black stilettos' },
            { name: "Women's White Sneakers", category: 'shoes', price: 7500, image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=400&fit=crop', color: 'White', gender: 'women', description: 'Trendy platform sneakers' },
            { name: "Women's Nude Flats", category: 'shoes', price: 5500, image_url: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400&h=400&fit=crop', color: 'Beige', gender: 'women', description: 'Comfortable ballet flats' },
            { name: "Women's Gold Necklace", category: 'accessories', price: 15000, image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop', color: 'Gold', gender: 'women', description: 'Delicate gold chain necklace' },
            { name: "Women's Leather Handbag", category: 'accessories', price: 18000, image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop', color: 'Brown', gender: 'women', description: 'Stylish leather tote bag' },
            { name: "Women's Scarf", category: 'accessories', price: 3500, image_url: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&h=400&fit=crop', color: 'Multi', gender: 'women', description: 'Colorful silk scarf' },

            // UNISEX
            { name: "Unisex Black Hoodie", category: 'tops', price: 5500, image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', color: 'Black', gender: 'unisex', description: 'Comfortable cotton hoodie' },
            { name: "Unisex Grey Sweatpants", category: 'bottoms', price: 4500, image_url: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&h=400&fit=crop', color: 'Grey', gender: 'unisex', description: 'Relaxed fit joggers' },
            { name: "Unisex Sunglasses", category: 'accessories', price: 8000, image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop', color: 'Black', gender: 'unisex', description: 'Classic aviator sunglasses' },
            { name: "Unisex Canvas Backpack", category: 'accessories', price: 6500, image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', color: 'Brown', gender: 'unisex', description: 'Durable canvas backpack' },
        ];

        for (const p of products) {
            await pool.query(`
                INSERT INTO products (name, description, category, price, image_url, color, gender, in_stock, stock_quantity)
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 50)
            `, [p.name, p.description, p.category, p.price, p.image_url, p.color, p.gender]);
        }

        console.log(`✅ Inserted ${products.length} gender-specific products`);

        // Verify
        const [verify] = await pool.query(`
            SELECT gender, COUNT(*) as count FROM products GROUP BY gender
        `);
        console.log('📊 Products by gender:', verify);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

addGenderColumn();
