import psycopg2
from psycopg2 import Error
from database import connect_to_database

# Tokens Table
def create_tokens_table(connection):
    cursor = connection.cursor()
    create_tokens_table = """
    CREATE TABLE IF NOT EXISTS tokens (
        token_id SERIAL PRIMARY KEY,  -- Unique identifier for each row
        token_symbol TEXT NOT NULL,  -- Symbol/ticker name for the token
        token_address TEXT NOT NULL,  -- Token's blockchain address
        added_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Time when the token was added
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

# Financial Metrics Table
def create_financial_metrics_table(connection):
    cursor = connection.cursor()
    create_financial_metrics_table = """
    CREATE TABLE IF NOT EXISTS financial_metrics (
        id SERIAL PRIMARY KEY,
        token_id INT,
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

# Static Info Table
def create_static_info_table(connection):
    cursor = connection.cursor()
    create_static_info_table = """
    CREATE TABLE IF NOT EXISTS static_info (
        id SERIAL PRIMARY KEY,
        token_id INT,
        twitter TEXT,
        telegram TEXT,
        website TEXT,
        liqlock VARCHAR(10),
        mutable VARCHAR(10),
        topholder VARCHAR(10),
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
        
# conn = connect_to_database()
# if conn:
#     create_tokens_table(conn)
#     create_financial_metrics_table(conn)
#     create_static_info_table(conn)