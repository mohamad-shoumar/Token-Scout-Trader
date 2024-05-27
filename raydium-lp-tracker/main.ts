import { query } from './db'; 
import axios from 'axios';
import { startConnection, connection, RAYDIUM, INSTRUCTION_NAME } from './ray';


// Function to fetch the most recently added tokens from the database
async function fetchRecentTokens(limit:number = 30) {
    try {

        const fetchTokensQuery = 'SELECT token_address FROM tokens ORDER BY added_timestamp DESC LIMIT $1'
        const result = await query (fetchTokensQuery, [limit])
        return result.rows
        
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

        // response.data.pairs.forEach((pair: any) => {
        //     console.log('Pair Address:', pair.pairAddress);
        //     console.log('Base Token:', pair.baseToken);
        //     console.log('Transactions:', pair.txns);
        // });
    } catch (error) {
        console.error('Error sending API request:', error);
    }
}

async function main() {
    await startConnection(connection, RAYDIUM, INSTRUCTION_NAME);
    
    const interval = 15000; // Interval in milliseconds (10000ms is 10 seconds)

    setInterval(async () => {
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