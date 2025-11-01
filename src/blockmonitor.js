// ============================================
// index.js
// ============================================
require("dotenv").config();
const { ethers } = require("ethers");
const { Pool } = require("pg");

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
  WATCHED_ADDRESS: process.env.WATCHED_ADDRESS.toLowerCase(),
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
            // transactionHash: transfer.transactionHash,
            fromAddress: transfer.fromAddress,
            toAddress: transfer.toAddress,
            amount: transfer.amount,
            value: transfer.value,
            tokenAddress: transfer.tokenAddress,
            logIndex: transfer.logIndex,
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
      // Don't throw - webhook failures shouldn't stop the scanner(maybe later)
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
    console.log(`Processing block ${blockNumber}...`);

    // Get block with transactions
    const block = await this.provider.getBlock(blockNumber, true);

    if (!block || !block.transactions) {
      console.log(`Block ${blockNumber} has no transactions`);
      return [];
    }

    const transfers = [];

    // Filter transactions sent to watched addresses
    for (const txHash of block.transactions) {
      try {
        const tx = await this.provider.getTransaction(txHash);

        if (!tx || !tx.to) continue;

        const toAddress = tx.to.toLowerCase();

        // Check if transaction is sent to a watched address
        if (CONFIG.WATCHED_ADDRESS === toAddress) {
          const receipt = await this.provider.getTransactionReceipt(txHash);

          if (receipt && receipt.logs) {
            // Extract ERC20 transfer events
            for (const log of receipt.logs) {
              if (
                log.topics[0] === ERC20_TRANSFER_TOPIC &&
                log.topics.length >= 3
              ) {
                try {
                  // Decode transfer event
                  // topics[1] = from address (padded)
                  // topics[2] = to address (padded)
                  // data = amount
                  const fromAddress = ethers.getAddress(
                    "0x" + log.topics[1].slice(26)
                  );
                  const toAddress = ethers.getAddress(
                    "0x" + log.topics[2].slice(26)
                  );
                  const amount = ethers.getBigInt(log.data).toString();
                  const value = tx.value.toString();

                  transfers.push({
                    blockNumber,
                    transactionHash: txHash,
                    fromAddress,
                    toAddress,
                    amount,
                    value,
                    tokenAddress: log.address.toLowerCase(),
                    logIndex: log.index,
                  });
                } catch (decodeError) {
                  console.error(
                    `Error decoding transfer event in tx ${txHash}:`,
                    decodeError.message
                  );
                }
              }
            }
          }
        }
      } catch (txError) {
        console.error(
          `Error processing transaction ${txHash}:`,
          txError.message
        );
      }
    }

    console.log(
      `Found ${transfers.length} ERC20 transfers in block ${blockNumber}`
    );
    return transfers;
  }

  async storeBlockData(startBlock, endBlock, transfers) {
    const client = await pool.connect();
    let relevantTransfers = [];
    try {
      // Filter transfers to only include those where from or to address exists in wallets table
      if (transfers.length > 0) {
        // Get all unique addresses from transfers
        console.log(transfers, "transfers");
        const allAddresses = new Set();
        transfers.forEach((transfer) => {
          allAddresses.add(transfer.fromAddress.toLowerCase());
          allAddresses.add(transfer.toAddress.toLowerCase());
        });

        // Query database to check which addresses exist in wallets table
        const addressArray = Array.from(allAddresses);

        let walletAddresses;
        if (CONFIG.BLOCKCHAIN_MONITOR_TEST) {
          walletAddresses = new Set(addressArray);
        } else {
          const placeholders = addressArray.map((_, i) => `${i + 1}`).join(",");
          const walletQuery = `
          SELECT LOWER(address) as address 
          FROM wallets 
          WHERE LOWER(address) IN (${placeholders})
          AND status = 'ACTIVE'
        `;

          const walletResult = await client.query(walletQuery, addressArray);
          walletAddresses = new Set(
            walletResult.rows.map((row) => row.address)
          );
        }

        // Filter transfers where from or to address exists in wallets
        relevantTransfers = transfers.filter(
          (transfer) =>
            walletAddresses.has(transfer.fromAddress.toLowerCase()) ||
            walletAddresses.has(transfer.toAddress.toLowerCase())
        );

        // Log only relevant transfers
        if (relevantTransfers.length > 0) {
          console.log(
            `\n📋 Block ${startBlock} - ${endBlock} Found ${relevantTransfers.length} relevant transfer(s):`
          );
          relevantTransfers.forEach((transfer, index) => {
            const fromInWallet = walletAddresses.has(
              transfer.fromAddress.toLowerCase()
            );
            const toInWallet = walletAddresses.has(
              transfer.toAddress.toLowerCase()
            );
            const direction =
              fromInWallet && toInWallet
                ? "internal"
                : fromInWallet
                ? "outgoing"
                : "incoming";

            transfer.direction = direction;

            console.log(`\n  ${direction} Transfer #${index + 1}:`);
            console.log(`    Transaction Hash: ${transfer.transactionHash}`);
            console.log(
              `    From: ${transfer.fromAddress}${fromInWallet ? " ✓" : ""}`
            );
            console.log(
              `    To: ${transfer.toAddress}${toInWallet ? " ✓" : ""}`
            );
            console.log(`    Amount: ${transfer.amount}`);
            console.log(`    ETH Value: ${transfer.value}`);
            console.log(`    Token Address: ${transfer.tokenAddress}`);
          });
          console.log("");
        } else {
          console.log(`No transfers involving tracked wallets`);
        }
      }

      await this.sendWebhook(relevantTransfers, startBlock, endBlock);

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
        JSON.stringify({ blockNumber: endBlock }), //24541908
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
      for (
        let blockNumber = currentBlock;
        blockNumber <= endBlock;
        blockNumber++
      ) {
        if (!this.isRunning) {
          console.log("Scanner stopped");
          break;
        }

        try {
          const transfers = await this.processBlock(blockNumber);
          transferEvents = transferEvents.concat(transfers);
        } catch (error) {
          console.error(
            `Error processing block ${blockNumber}:`,
            error.message
          );
          // Don't continue on error - will retry on next scan
          break;
        }
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
