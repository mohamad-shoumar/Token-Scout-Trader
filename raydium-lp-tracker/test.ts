import { query, close } from './db';

async function testDbConnection() {
    try {
        const res = await query('SELECT NOW()', []);
        console.log('Database connected:', res.rows[0]);
    } catch (err) {
        console.error('Error connecting to the database:', err);
    } finally {
        close();
    }
}

testDbConnection();
