import { query, close as closeDbConnection } from './db'; 
import axios from 'axios';
import { startConnection, connection, RAYDIUM, INSTRUCTION_NAME } from './ray';

let intervalId: NodeJS.Timeout;

// Function to fetch the most recently added tokens from the database
async function fetchRecentTokens(limit: number = 30) {
    try {
        const fetchTokensQuery = 'SELECT token_address FROM tokens ORDER BY added_timestamp DESC LIMIT $1';
        const result = await query(fetchTokensQuery, [limit]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching tokens from the database:', error);
        return [];
    }
}

// Function to send API requests using the fetched tokens
async function sendApiRequests(tokens: { token_address: string }[]) {
    const tokenAddresses = tokens.map(token => token.token_address).join(',');
    try {
        const apiUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddresses}`;
        const response = await axios.get(apiUrl);
        console.log('API response:', response.data);

        if (response.data.pairs && Array.isArray(response.data.pairs)) {
            for (const pair of response.data.pairs) {
                await saveFinancialMetrics(pair);
            }
        } else {
            console.error('API response does not contain pairs or pairs is not an array.');
        }
    } catch (error) {
        console.error('Error sending API request:', error);
    }
}

// Function to check if the price has changed
async function hasPriceChanged(tokenAddress: string, newPriceUsd: number): Promise<boolean> {
    const checkPriceQuery = `
        SELECT price_usd 
        FROM financial_metrics 
        WHERE token_id = (SELECT token_id FROM tokens WHERE token_address = $1)
        ORDER BY timestamp DESC LIMIT 1`;

    try {
        const result = await query(checkPriceQuery, [tokenAddress]);
        if (result.rows.length > 0) {
            const lastPrice = parseFloat(result.rows[0].price_usd);
            return lastPrice !== newPriceUsd;
        }
        return true; 
    } catch (error) {
        console.error('Error checking last price:', error);
        return true; 
    }
}

// Function to save financial metrics to the database
async function saveFinancialMetrics(pair: any) {
    const getTokenIdQuery = 'SELECT token_id FROM tokens WHERE token_address = $1';
    const insertMetricsQuery = `
        INSERT INTO financial_metrics (
            token_id, token_symbol, dex_id, price_usd, m5_buys, m5_sells, 
            h1_buys, h1_sells, h6_buys, h6_sells, h24_buys, h24_sells, 
            h24_buy_sells, volume_5m, volume_1h, volume_6h, price_change_5m, 
            price_change_1h, price_change_6h, fdv, price_change_24h, 
            volume_24h, liquidity_usd
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
            $17, $18, $19, $20, $21, $22, $23
        ) RETURNING *`;

    try {
        const result = await query(getTokenIdQuery, [pair.baseToken.address]);
        if (result.rows.length === 0) {
            console.error(`Token ID not found for address: ${pair.baseToken.address}`);
            return;
        }

        const tokenId = result.rows[0].token_id;
        const newPriceUsd = parseFloat(pair.priceUsd);

        const priceChanged = await hasPriceChanged(pair.baseToken.address, newPriceUsd);
        if (!priceChanged) {
            console.log(`Price for token ${pair.baseToken.symbol} has not changed. Skipping insertion.`);
            return;
        }

        const metrics = [
            tokenId,
            pair.baseToken.symbol,
            pair.dexId,
            newPriceUsd,
            pair.txns.m5.buys,
            pair.txns.m5.sells,
            pair.txns.h1.buys,
            pair.txns.h1.sells,
            pair.txns.h6.buys,
            pair.txns.h6.sells,
            pair.txns.h24.buys,
            pair.txns.h24.sells,
            pair.txns.h24.buys + pair.txns.h24.sells,
            parseFloat(pair.volume.m5),
            parseFloat(pair.volume.h1),
            parseFloat(pair.volume.h6),
            parseFloat(pair.priceChange.m5),
            parseFloat(pair.priceChange.h1),
            parseFloat(pair.priceChange.h6),
            parseFloat(pair.fdv),
            parseFloat(pair.priceChange.h24),
            parseFloat(pair.volume.h24),
            parseFloat(pair.liquidity.usd),
        ];

        const insertResult = await query(insertMetricsQuery, metrics);
        console.log(`Inserted financial metrics for token ${pair.baseToken.symbol}:`, insertResult.rows[0]);
    } catch (error) {
        console.error('Error saving financial metrics to the database:', error);
    }
}

// Function to shut down the application
async function gracefulShutdown() {
    clearInterval(intervalId);
    await closeDbConnection(); 
    console.log('Shutdown complete.');
    process.exit(0); 
}

async function main() {
    await startConnection(connection, RAYDIUM, INSTRUCTION_NAME);

    const interval = 10000; 

    intervalId = setInterval(async () => {
        const recentTokens = await fetchRecentTokens();
        if (recentTokens.length === 0) {
            console.log('No recent tokens found.');
            return;
        }

        console.log('Recent tokens:', recentTokens);
        await sendApiRequests(recentTokens);
    }, interval);
}

main().catch(console.error);

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
