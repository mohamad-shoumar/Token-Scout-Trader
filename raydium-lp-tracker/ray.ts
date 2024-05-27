import { Connection, PublicKey } from '@solana/web3.js';
import { query } from './db';

const RAYDIUM_PUBLIC_KEY = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const HTTP_URL = "https://cold-black-emerald.solana-mainnet.quiknode.pro/c9c629561d539d4c32759e3280b24aea3135eac9/";
const WSS_URL = "wss://cold-black-emerald.solana-mainnet.quiknode.pro/c9c629561d539d4c32759e3280b24aea3135eac9/";
const RAYDIUM = new PublicKey(RAYDIUM_PUBLIC_KEY);
const INSTRUCTION_NAME = "initialize2";

const connection = new Connection(HTTP_URL, {
    wsEndpoint: WSS_URL
});

async function startConnection(connection: Connection, programAddress: PublicKey, searchInstruction: string): Promise<void> {
    console.log("Monitoring logs for program:", programAddress.toString());
    connection.onLogs(
        programAddress,
        ({ logs, err, signature }) => {
            if (err) return;

            if (logs && logs.some(log => log.includes(searchInstruction))) {
                console.log("Signature for 'initialize2':", `https://explorer.solana.com/tx/${signature}`);
                fetchRaydiumMints(signature, connection);
            }
        },
        "finalized"
    );
}

async function fetchRaydiumMints(txId: string, connection: Connection) {
    try {
        const tx = await connection.getParsedTransaction(
            txId,
            {
                maxSupportedTransactionVersion: 0,
                commitment: 'confirmed'
            });

        //@ts-ignore
        const accounts = (tx?.transaction.message.instructions).find(ix => ix.programId.toBase58() === RAYDIUM_PUBLIC_KEY).accounts as PublicKey[];
    
        if (!accounts) {
            console.log("No accounts found in the transaction.");
            return;
        }
    
        const tokenAIndex = 8;
        const tokenBIndex = 9;
    
        const tokenAAccount = accounts[tokenAIndex];
        const tokenBAccount = accounts[tokenBIndex];
    
        const displayData = [
            { "Token": "A", "Account Public Key": tokenAAccount.toBase58() },
            { "Token": "B", "Account Public Key": tokenBAccount.toBase58() }
        ];

        console.log("New LP Found");
        console.table(displayData);

        const tokenAddresses = [tokenAAccount.toBase58(), tokenBAccount.toBase58()];
        await storeTokensInDB(tokenAddresses); // Store tokens in the database
    
    } catch (error) {
        console.log("Error fetching transaction:", txId, error);
        return;
    }
}

async function storeTokensInDB(tokenAddresses: string[]) {
    const SOLANA_ADDRESS = "So11111111111111111111111111111111111111112";
    try {
        const checkTokenExistsQuery = 'SELECT COUNT(*) FROM tokens WHERE token_address = $1';
        const insertTokenQuery = 'INSERT INTO tokens (token_symbol, token_address) VALUES ($1, $2) RETURNING *';
        
        for (const address of tokenAddresses) {
            if (address !== SOLANA_ADDRESS) { 
                const result = await query(checkTokenExistsQuery, [address]);
                const count = parseInt(result.rows[0].count, 10);

                if (count === 0) { 
                    const insertResult = await query(insertTokenQuery, ['Unknown', address]);
                    console.log(`Inserted token into DB: ${insertResult.rows[0].token_address}`);
                } else {
                    console.log(`Token already exists in the database: ${address}`);
                }
            }
        }
    } catch (error) {
        console.error('Error storing tokens in the database:', error);
    }
}

export { startConnection, connection, RAYDIUM, INSTRUCTION_NAME };
