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
// Function to monitor the token for 15 minutes
// async function monitorTokenFor15Minutes(tokenId: number, tokenAddress: string) {
//     const startTime = Date.now();
//     const duration = 15 * 60 * 1000; // 15 minutes in milliseconds
//     let isGoodToken = true;

//     const interval = setInterval(async () => {
//         const currentTime = Date.now();
//         if (currentTime - startTime >= duration) {
//             clearInterval(interval);
//             if (isGoodToken) {
//                 await moveToGoodTokens(tokenId, tokenAddress);
//             }
//         } else {
//             const metrics = await fetchCurrentMetrics(tokenId);
//             if (!metrics) {
//                 isGoodToken = false;
//                 clearInterval(interval);
//                 await deleteToken(tokenId);
//             } else {
//                 const { volume_5m, price_change_5m, lp_locked_pct } = metrics;
//                 if (volume_5m < 150000 || price_change_5m < -50 || lp_locked_pct < 50) {
//                     isGoodToken = false;
//                     clearInterval(interval);
//                     await deleteToken(tokenId);
//                 }
//             }
//         }
//     }, 60000); // Check every minute
// }



// Function to move token to good_tokens table
// async function moveToGoodTokens(tokenId: number, tokenAddress: string) {
//     const insertGoodTokenQuery = `
//         INSERT INTO good_tokens (token_id, token_address)
//         VALUES ($1, $2)
//         ON CONFLICT (token_id) DO NOTHING`;

//     try {
//         await query(insertGoodTokenQuery, [tokenId, tokenAddress]);
//         console.log(`Inserted good token with ID ${tokenId} into good_tokens`);
//     } catch (error) {
//         console.error('Error inserting good token:', error);
//     }
// }

// // Function to delete token from all tables
// async function deleteToken(tokenId: number) {
//     const deleteTokenQuery = 'DELETE FROM tokens WHERE token_id = $1';
//     const deleteMetricsQuery = 'DELETE FROM financial_metrics WHERE token_id = $1';
//     const deleteStaticInfoQuery = 'DELETE FROM static_info WHERE token_id = $1';

//     try {
//         await query(deleteMetricsQuery, [tokenId]);
//         await query(deleteStaticInfoQuery, [tokenId]);
//         await query(deleteTokenQuery, [tokenId]);
//         console.log(`Deleted bad-performing token with ID ${tokenId}`);
//     } catch (error) {
//         console.error('Error deleting bad-performing token:', error);
//     }
// }
