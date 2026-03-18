import mysql from 'mysql2/promise';

async function addColumn() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '20020224Ha',
        database: 'minutemax'
    });

    try {
        const [cols] = await pool.query(`SHOW COLUMNS FROM outfit_matches LIKE 'detected_gender'`);
        if (cols.length === 0) {
            await pool.query('ALTER TABLE outfit_matches ADD COLUMN detected_gender VARCHAR(10)');
            console.log('✅ Added detected_gender column');
        } else {
            console.log('ℹ️ Column already exists');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

addColumn();
