import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '20020224Ha',
    database: 'minutemax'
});

console.log('\\n📊 Products from CoolPlanet.lk in database:\\n');

// Count products by brand
const [brandCounts] = await conn.query(`
    SELECT brand, gender, COUNT(*) as count 
    FROM products 
    WHERE brand IN ('Hada', 'King Street', 'Hustle', 'Andriana', 'Cool Planet', 'Modano', 'Envogue')
    GROUP BY brand, gender
    ORDER BY brand, gender
`);
console.log('Products by brand and gender:');
console.table(brandCounts);

// Sample products
const [samples] = await conn.query(`
    SELECT id, name, brand, gender, price, image_url
    FROM products 
    WHERE brand IN ('Hada', 'King Street', 'Hustle', 'Andriana', 'Cool Planet', 'Modano', 'Envogue')
    ORDER BY id DESC 
    LIMIT 10
`);
console.log('\\nSample products (10 most recent):');
samples.forEach(p => {
    console.log(`  ${p.id}. ${p.name} (${p.brand}, ${p.gender}, Rs. ${p.price})`);
    console.log(`     Image: ${p.image_url ? p.image_url.substring(0, 60) + '...' : 'N/A'}`);
});

// Total count
const [total] = await conn.query(`
    SELECT COUNT(*) as total 
    FROM products 
    WHERE brand IN ('Hada', 'King Street', 'Hustle', 'Andriana', 'Cool Planet', 'Modano', 'Envogue')
`);
console.log(`\\n✅ Total CoolPlanet products in database: ${total[0].total}`);

await conn.end();
