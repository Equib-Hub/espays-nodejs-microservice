// ============================================
// index.js
// ============================================
require("dotenv").config();
const { ethers } = require("ethers");
const { Pool } = require("pg");
const { getHotWalletAddress, getAssetIdByAddress } = require("./utils/helpers");

// Database connection pool

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function initializeDatabase() {
  const client = await pool.connect();

  try {
    console.log("Creating database schema...");

    const query = `
      CREATE TABLE IF NOT EXISTS blockchain_data (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_blockchain_data_name ON blockchain_data(name);
    `;

    await client.query(query);
    console.log("✓ Database schema created successfully");
  } catch (error) {
    console.error("Error creating database schema:", error);
    throw error;
  } finally {
    client.release();
  }
}

initializeDatabase()
  .then(() => {
    console.log("Database initialization complete");
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  })
  .finally(() => {
    main().catch(async (error) => {
      console.error("Fatal error:", error);
      await pool.end();
      process.exit(1);
    });
  });

// Configuration
const CONFIG = {
  RPC_URL: process.env.TORONET_RPC || "https://toronet.org/rpc/",
  STARTING_BLOCK: parseInt(process.env.STARTING_BLOCK) || 24541889,
  WATCHED_ADDRESS: process.env.WATCHED_ADDRESS?.toLowerCase() || (() => {
    throw new Error('WATCHED_ADDRESS is required in .env file');
  })(),
  SCAN_BATCH_SIZE: parseInt(process.env.SCAN_BATCH_SIZE) || 300,
  POLLING_INTERVAL: parseInt(process.env.POLLING_INTERVAL) || 30000, // ms
  WEBHOOK_URL: process.env.WEBHOOK_URL,
  BLOCKCHAIN_MONITOR_TEST: process.env.BLOCKCHAIN_MONITOR_TEST,
};

// ERC20 Transfer event signature
const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

class BlockchainScanner {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.isRunning = false;
  }

  async initialize() {
    console.log("Initializing blockchain scanner...");
    console.log(`Watching address: ${CONFIG.WATCHED_ADDRESS}`);
    let assetId = await getAssetIdByAddress(CONFIG.WATCHED_ADDRESS);
    
    if (!assetId) {
      throw new Error("No asset id for watched address");
    }

    let hotWallet = await getHotWalletAddress(assetId);

    if (!hotWallet) throw new Error("No hot wallet address");

    this.hotWalletAddress = hotWallet.toLowerCase();
    // Test database connection
    try {
      const client = await pool.connect();
      await client.query("SELECT NOW()");
      client.release();
      console.log("✓ Database connection established");
    } catch (error) {
      console.error("✗ Database connection failed:", error.message);
      throw error;
    }
  }

  async sendWebhook(transfers, startBlock, endBlock) {
    if (!CONFIG.WEBHOOK_URL) {
      throw "⚠ Webhook URL not configured, skipping webhook call";
    }

    try {
      const response = await fetch(CONFIG.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startBlock,
          endBlock,
          transferCount: transfers.length,
          transfers: transfers.map((transfer) => ({
            blockNumber: transfer.blockNumber,
            transactionHash: transfer.transactionHash,
            fromAddress: transfer.fromAddress,
            toAddress: transfer.toAddress,
            amount: ethers.formatEther(transfer.amount),
            tokenAddress: transfer.tokenAddress,
            direction: transfer.direction,
          })),
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error(
          `✗ Webhook failed with status ${response.status}: ${response.statusText}`
        );
        return;
      }

      console.log(
        `✓ Webhook sent successfully for block  ${startBlock} - ${endBlock}  (${transfers.length} transfers)`
      );
    } catch (error) {
      console.error(`✗ Error sending webhook:`, error.message);
      throw error;
    }
  }

  async getLastProcessedBlock() {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT data FROM blockchain_data WHERE name = $1",
        ["last_processed_block"]
      );

      if (
        result.rows.length > 0 &&
        result.rows[0].data &&
        result.rows[0].data.blockNumber
      ) {
        const blockNumber = result.rows[0].data.blockNumber;
        console.log(`Resuming from block ${blockNumber}`);
        return blockNumber;
      }

      console.log(
        `No previous state found. Starting from block ${CONFIG.STARTING_BLOCK}`
      );
      return CONFIG.STARTING_BLOCK;
    } catch (error) {
      console.error("Error fetching last processed block:", error);
      return CONFIG.STARTING_BLOCK;
    } finally {
      client.release();
    }
  }

  async getLatestBlockNumber() {
    return await this.provider.getBlockNumber();
  }

  async processBlock(blockNumber) {
    console.log(`Processing blocks ${blockNumber}...`);
    
    // This will be filled with fromBlock and toBlock for batch processing
    return [];
  }

  async processBlockRange(fromBlock, toBlock) {
    console.log(`Processing block range ${fromBlock} - ${toBlock}...`);

    try {
      // Get all wallet addresses from database that we need to monitor
      const client = await pool.connect();
      let monitoredAddresses = [];
      
      try {
        if (CONFIG.BLOCKCHAIN_MONITOR_TEST) {
          // In test mode, monitor hot wallet only
          monitoredAddresses = [this.hotWalletAddress];
        } else {
          // Get all active wallet addresses from database
          const walletQuery = `
            SELECT DISTINCT LOWER(address) as address 
            FROM wallets 
            WHERE status = 'ACTIVE'
            LIMIT 1000
          `;
          const result = await client.query(walletQuery);
          monitoredAddresses = result.rows.map(row => row.address);
          
          // Add hot wallet if not in list
          if (!monitoredAddresses.includes(this.hotWalletAddress)) {
            monitoredAddresses.push(this.hotWalletAddress);
          }
          
          console.log(`Loaded ${monitoredAddresses.length} wallet addresses from database`);
        }
      } finally {
        client.release();
      }

      if (monitoredAddresses.length === 0) {
        console.log('No addresses to monitor');
        return [];
      }

      console.log(this.hotWalletAddress ? `Hot wallet address: ${this.hotWalletAddress}` : 'No hot wallet configured');
      
      console.log(`Monitoring ${monitoredAddresses.length} wallet addresses`);

      // Use eth_getLogs to get Transfer events involving our wallets
      // Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
      const transfers = [];
      
      // We need to query in batches because too many addresses can exceed RPC limits
      const BATCH_SIZE = 100;
      for (let i = 0; i < monitoredAddresses.length; i += BATCH_SIZE) {
        const addressBatch = monitoredAddresses.slice(i, i + BATCH_SIZE);
        
        // Pad addresses to 32 bytes for topic filtering
        const paddedAddresses = addressBatch.map(addr => 
          '0x' + addr.slice(2).padStart(64, '0')
        );

        // Query 1: Get transfers FROM our wallets (withdrawals)
        const logsFrom = await this.provider.getLogs({
          fromBlock: fromBlock,
          toBlock: toBlock,
          address: CONFIG.WATCHED_ADDRESS, // The token contract
          topics: [
            ERC20_TRANSFER_TOPIC, // Transfer event
            paddedAddresses, // from addresses (our wallets)
            null // to any address
          ]
        });

        // Query 2: Get transfers TO our wallets (deposits)
        const logsTo = await this.provider.getLogs({
          fromBlock: fromBlock,
          toBlock: toBlock,
          address: CONFIG.WATCHED_ADDRESS, // The token contract
          topics: [
            ERC20_TRANSFER_TOPIC, // Transfer event
            null, // from any address
            paddedAddresses // to addresses (our wallets)
          ]
        });

        // Combine and deduplicate logs
        const allLogs = [...logsFrom, ...logsTo];
        const uniqueLogs = Array.from(
          new Map(allLogs.map(log => [log.transactionHash + log.logIndex, log])).values()
        );

        // Process each log
        for (const log of uniqueLogs) {
          try {
            const fromAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
            const toAddress = ethers.getAddress('0x' + log.topics[2].slice(26));
            const amount = ethers.getBigInt(log.data).toString();

            // Get transaction to get the value (ETH sent)
            const tx = await this.provider.getTransaction(log.transactionHash);
            const value = tx ? tx.value.toString() : '0';

            transfers.push({
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              fromAddress,
              toAddress,
              amount,
              value,
              tokenAddress: log.address.toLowerCase(),
              logIndex: log.index,
            });
          } catch (decodeError) {
            console.error(
              `Error decoding transfer event in tx ${log.transactionHash}:`,
              decodeError.message
            );
          }
        }
      }

      console.log(
        `Found ${transfers.length} ERC20 transfers involving monitored wallets in blocks ${fromBlock}-${toBlock}`
      );
      return transfers;
    } catch (error) {
      console.error(`Error processing block range ${fromBlock}-${toBlock}:`, error.message);
      throw error;
    }
  }

  async storeBlockData(startBlock, endBlock, transfers) {
    const client = await pool.connect();
    let relevantTransfers = [];
    try {
      // All transfers are already relevant (we queried for our wallets)
      if (transfers.length > 0) {
        console.log(
          `\n📋 Block ${startBlock} - ${endBlock} Found ${transfers.length} relevant transfer(s):`
        );
        
        // Get user wallets (excluding hot wallet) for direction logic
        const userWallets = [];
        if (!CONFIG.BLOCKCHAIN_MONITOR_TEST) {
          const walletQuery = `
            SELECT DISTINCT LOWER(address) as address 
            FROM wallets 
            WHERE status = 'ACTIVE' AND LOWER(address) != $1
            LIMIT 1000
          `;
          const result = await client.query(walletQuery, [this.hotWalletAddress]);
          userWallets.push(...result.rows.map(row => row.address));
        }
        
        relevantTransfers = transfers.map((transfer) => {
          const fromWallet = transfer.fromAddress.toLowerCase();
          const toWallet = transfer.toAddress.toLowerCase();
          
          let direction;
          if (fromWallet === this.hotWalletAddress) {
            // Hot wallet is sending - this is outgoing (withdrawal)
            direction = "outgoing";
          } else if (userWallets.includes(toWallet) || toWallet === this.hotWalletAddress) {
            // Transfer to user wallet or hot wallet - this is incoming (deposit)
            direction = "incoming";
          } else {
            // Transfer between user wallets or other scenarios - mark as unknown
            direction = "unknown";
          }
          
          return {
            ...transfer,
            direction
          };
        });

        // Log sample of transfers (not all to avoid spam)
        const sampleSize = Math.min(5, relevantTransfers.length);
        console.log(`Showing ${sampleSize} of ${relevantTransfers.length} transfers:`);
        relevantTransfers.slice(0, sampleSize).forEach((transfer, index) => {
          console.log(`  ${index + 1}. ${transfer.direction.toUpperCase()}: ${transfer.fromAddress.slice(0, 10)}... -> ${transfer.toAddress.slice(0, 10)}... (${ethers.formatEther(transfer.amount)} tokens)`);
        });

        // Only send webhook if there are transfers
        await this.sendWebhook(relevantTransfers, startBlock, endBlock);
      } else {
        console.log(`No transfers involving tracked wallets`);
      }

      // Start transaction
      await client.query("BEGIN");

      // Only update last processed block in database
      const updateBlockQuery = `
        INSERT INTO blockchain_data (name, data, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (name) 
        DO UPDATE SET 
          data = $2,
          updated_at = NOW()
      `;

      await client.query(updateBlockQuery, [
        "last_processed_block",
        JSON.stringify({ blockNumber: endBlock }),
      ]);

      // Commit transaction
      await client.query("COMMIT");
      console.log(
        `✓ Block ${startBlock} - ${endBlock}  progress saved to database`
      );
    } catch (error) {
      // Rollback on error
      await client.query("ROLLBACK");
      console.error(
        `✗ Error storing block ${startBlock} - ${endBlock} progress, transaction rolled back:`,
        error.message
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async scanBlocks() {
    try {
      const lastProcessedBlock = await this.getLastProcessedBlock();
      const latestBlock = await this.getLatestBlockNumber();

      console.log(
        `Last processed: ${lastProcessedBlock}, Latest: ${latestBlock}`
      );

      if (lastProcessedBlock >= latestBlock) {
        console.log("Already at latest block, waiting for new blocks...");
        return;
      }

      let currentBlock = lastProcessedBlock + 1;
      const endBlock = Math.min(
        currentBlock + CONFIG.SCAN_BATCH_SIZE - 1,
        latestBlock
      );

      let transferEvents = [];
      try {
        transferEvents = await this.processBlockRange(currentBlock, endBlock);
      } catch (error) {
        console.error(
          `Error processing block range ${currentBlock}-${endBlock}:`,
          error.message
        );
        // Don't continue on error - will retry on next scan
      }

      await this.storeBlockData(currentBlock, endBlock, transferEvents);
    } catch (error) {
      console.error("Error in scanBlocks:", error);
    }
  }

  async start() {
    await this.initialize();
    this.isRunning = true;

    console.log("Starting blockchain scanner...");

    const scanLoop = async () => {
      if (!this.isRunning) return;

      try {
        await this.scanBlocks();
      } catch (error) {
        console.error("Scan error:", error);
      }

      setTimeout(scanLoop, CONFIG.POLLING_INTERVAL);
    };

    scanLoop();
  }

  stop() {
    console.log("Stopping blockchain scanner...");
    this.isRunning = false;
  }
}

// Main execution
async function main() {
  const scanner = new BlockchainScanner();

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nReceived SIGINT, shutting down gracefully...");
    scanner.stop();
    await pool.end();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\nReceived SIGTERM, shutting down gracefully...");
    scanner.stop();
    await pool.end();
    process.exit(0);
  });

  await scanner.start();
}
