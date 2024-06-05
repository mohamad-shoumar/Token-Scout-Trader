import psycopg2
from psycopg2 import Error
from database import connect_to_database

def drop_tables(connection):
    cursor = connection.cursor()
    drop_query = """
    DROP TABLE IF EXISTS financial_metrics, static_info, tokens, good_tokens;
    """
    try:
        cursor.execute(drop_query)
        connection.commit()
        print("Tables dropped successfully")
    except Error as e:
        print(f"The error '{e}' occurred")
    finally:
        cursor.close()

def create_tokens_table(connection):
    cursor = connection.cursor()
    create_tokens_table = """
    CREATE TABLE IF NOT EXISTS tokens (
        token_id SERIAL PRIMARY KEY,
        token_address TEXT NOT NULL,
        added_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    try:
        cursor.execute(create_tokens_table)
        connection.commit()
        print("Table 'tokens' created successfully")
    except Error as e:
        print(f"The error '{e}' occurred")
    finally:
        cursor.close()

def create_financial_metrics_table(connection):
    cursor = connection.cursor()
    create_financial_metrics_table = """
    CREATE TABLE IF NOT EXISTS financial_metrics (
        id SERIAL PRIMARY KEY,
        token_id INT,
        token_symbol TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        dex_id TEXT,
        price_usd FLOAT,
        m5_buys INT,
        m5_sells INT,
        h1_buys INT,
        h1_sells INT,
        h6_buys INT,
        h6_sells INT,
        h24_buys INT,
        h24_sells INT,
        h24_buy_sells INT,
        volume_5m FLOAT,
        volume_1h FLOAT,
        volume_6h FLOAT,
        price_change_5m FLOAT,
        price_change_1h FLOAT,
        price_change_6h FLOAT,
        fdv FLOAT,
        price_change_24h FLOAT,
        volume_24h FLOAT,
        liquidity_usd FLOAT,
        FOREIGN KEY (token_id) REFERENCES tokens(token_id)
    );
    """
    try:
        cursor.execute(create_financial_metrics_table)
        connection.commit()
        print("Table 'financial_metrics' created successfully")
    except Error as e:
        print(f"The error '{e}' occurred")
    finally:
        cursor.close()

def create_static_info_table(connection):
    cursor = connection.cursor()
    create_static_info_table = """
    CREATE TABLE IF NOT EXISTS static_info (
        id SERIAL PRIMARY KEY,
        token_id INT,
        twitter TEXT,
        telegram TEXT,
        website TEXT,
        mint_authority TEXT,
        freeze_authority TEXT,
        is_immutable BOOLEAN,
        risks TEXT,
        score INT,
        reserve_supply BIGINT,
        current_supply BIGINT,
        pct_reserve FLOAT,
        pct_supply FLOAT,
        total_tokens_unlocked BIGINT,
        total_supply BIGINT,
        lp_locked BIGINT,
        lp_unlocked BIGINT,
        lp_locked_pct FLOAT,
        lp_locked_usd FLOAT,
        lp_max_supply BIGINT,
        lp_current_supply BIGINT,
        lp_total_supply BIGINT,
        rugged BOOLEAN,
        top_holders BIGINT,
        FOREIGN KEY (token_id) REFERENCES tokens(token_id)
    );
    """
    try:
        cursor.execute(create_static_info_table)
        connection.commit()
        print("Table 'static_info' created successfully")
    except Error as e:
        print(f"The error '{e}' occurred")
    finally:
        cursor.close()

def create_good_tokens_table(connection):
    cursor = connection.cursor()
    create_good_tokens_table = """
    CREATE TABLE IF NOT EXISTS good_tokens (
        token_id SERIAL PRIMARY KEY,
        token_address TEXT NOT NULL,
        added_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    try:
        cursor.execute(create_good_tokens_table)
        connection.commit()
        print("Table 'good_tokens' created successfully")
    except Error as e:
        print(f"The error '{e}' occurred")
    finally:
        cursor.close()

conn = connect_to_database()
if conn:
    drop_tables(conn)
    create_tokens_table(conn)
    create_financial_metrics_table(conn)
    create_static_info_table(conn)
    create_good_tokens_table(conn)
    conn.close()
