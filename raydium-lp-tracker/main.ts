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

// Function to send API request to fetch static info 
async function getStaticInfo(tokenAddress: string) {
    const getTokenIdQuery = 'SELECT token_id FROM tokens WHERE token_address = $1';
    const checkStaticInfoExistsQuery = 'SELECT 1 FROM static_info WHERE token_id = $1 LIMIT 1';

    try {
        const result = await query(getTokenIdQuery, [tokenAddress]);
        console.log(`Token address: ${tokenAddress}, result.rows length: ${result.rows.length}`);

        if (result.rows.length === 0) {
            console.error(`Token ID not found for address: ${tokenAddress}`);
            return;
        }

        const tokenId = result.rows[0].token_id;

        // Check if static info already exists
        const staticInfoExistsResult = await query(checkStaticInfoExistsQuery, [tokenId]);
        if (staticInfoExistsResult.rows.length > 0) {
            console.log(`Static info already exists for token ID: ${tokenId}`);
            return;
        }

        // Fetch static info from the API
        const xyzUrl = `https://api.rugcheck.xyz/v1/tokens/${tokenAddress}/report`;
        const response = await axios.get(xyzUrl);
        const data = response.data;
        await saveStaticInfo(tokenAddress, data);

        return data;
    } catch (error) {
        console.error('Error fetching static info:', error);
        return null;
    }
}
// Function to save the static info in the database
async function saveStaticInfo(tokenAddress: string, data: any) {
    const getTokenIdQuery = 'SELECT token_id FROM tokens WHERE token_address = $1';
    const insertStaticInfoQuery = `
        INSERT INTO static_info (
            token_id, twitter, telegram, website, mint_authority, freeze_authority, 
            is_immutable, risks, score, reserve_supply, current_supply, pct_reserve, 
            pct_supply, total_tokens_unlocked, total_supply, lp_locked, lp_unlocked, 
            lp_locked_pct, lp_locked_usd, lp_max_supply, lp_current_supply, 
            lp_total_supply, rugged, top_holders
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
            $17, $18, $19, $20, $21, $22, $23, $24
        ) RETURNING *`;

    try {
        const result = await query(getTokenIdQuery, [tokenAddress]);
        console.log(`Token address: ${tokenAddress}, result.rows length: ${result.rows.length}`);

        if (result.rows.length === 0) {
            console.error(`Token ID not found for address: ${tokenAddress}`);
            return;
        }

        const tokenId = result.rows[0].token_id;

        const lp = data.markets[0]?.lp || {};
        const staticInfo = [
            tokenId,
            data.tokenMeta.twitter || null,
            data.tokenMeta.telegram || null,
            data.tokenMeta.website || null,
            data.token.mintAuthority || null,
            data.token.freezeAuthority || null,
            data.token.isInitialized || null,
            JSON.stringify(data.risks) || null,
            data.score || null,
            lp.reserveSupply || null,
            lp.currentSupply || null,
            lp.pctReserve || null,
            lp.pctSupply || null,
            lp.totalTokensUnlocked || null,
            lp.tokenSupply || null,
            lp.lpLocked || null,
            lp.lpUnlocked || null,
            lp.lpLockedPct || null,
            lp.lpLockedUSD || null,
            lp.lpMaxSupply || null,
            lp.lpCurrentSupply || null,
            lp.lpTotalSupply || null,
            data.rugged || null,
            null 
        ];

        const insertResult = await query(insertStaticInfoQuery, staticInfo);
        console.log(`Inserted static info for token ${tokenAddress}:`, insertResult.rows[0]);
    } catch (error) {
        console.error('Error saving static info to the database:', error);
    }
}

// Function to send API requests using the fetched tokens
async function dexScreenerRequests(tokens: { token_address: string }[]) {
    const tokenAddresses = tokens.map(token => token.token_address).join(',');
    try {
        const apiUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddresses}`;
        const response = await axios.get(apiUrl);

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
    } catch (error) {
        console.error('Error saving financial metrics to the database:', error);
    }
}

// Function to fetch current financial metrics
async function fetchCurrentMetrics(tokenId: number) {
    const fetchMetricsQuery = `
        SELECT volume_5m, price_change_5m, (SELECT lp_locked_pct FROM static_info WHERE token_id = $1) AS lp_locked_pct
        FROM financial_metrics
        WHERE token_id = $1
        ORDER BY timestamp DESC LIMIT 1`;

    try {
        const result = await query(fetchMetricsQuery, [tokenId]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error('Error fetching current metrics:', error);
        return null;
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
        for (const token of recentTokens) {
            await getStaticInfo(token.token_address);
        }
    }, interval);
}
main().catch(console.error);

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
