const { ethers } = require("ethers");
const { addressExists } = require("../utils/helpers");

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = "Transfer(address,address,uint256)";
const TRANSFER_TOPIC = ethers.id(TRANSFER_EVENT_SIGNATURE);

/**
 * Monitor blockchain for ERC20 token transfer events
 * @param {Object} params - Parameters for monitoring
 * @param {string} params.tokenAddress - Contract address of the ERC20 token
 * @param {number} params.startBlock - Block number to start querying from
 * @param {number} params.numberOfBlocks - Maximum number of blocks to query
 * @param {number} params.endBlock - Block number to stop query at
 * @param {string} params.rpcUrl - RPC URL for blockchain connection
 * @param {number} params.maxNumberOfEvents - Maximum number of transfer events to get
 * @returns {Promise<Object>} Object containing transfer events and block range
 */
async function monitorTokenTransfers(params) {
  const {
    tokenAddress,
    startBlock,
    numberOfBlocks,
    endBlock,
    rpcUrl,
    maxNumberOfEvents,
    test,
  } = params;

  // Validate inputs
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    throw new Error("Invalid token address");
  }
  if (!rpcUrl) {
    throw new Error("RPC URL is required");
  }
  if (startBlock < 0 || numberOfBlocks <= 0 || maxNumberOfEvents <= 0) {
    throw new Error("Invalid block or event parameters");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const transferEvents = [];
  const tokenAddressLower = tokenAddress.toLowerCase();

  try {
    // Get the latest block number
    const latestBlock = await provider.getBlockNumber();

    // Calculate the actual end block
    let actualEndBlock = Math.min(
      startBlock + numberOfBlocks - 1,
      endBlock || latestBlock,
      latestBlock
    );

    console.log(
      `Monitoring token ${tokenAddress} from block ${startBlock} to ${actualEndBlock}`
    );

    let currentBlock = startBlock;
    let eventsCollected = 0;
    let blocksStopped = startBlock;

    // Process blocks one by one
    while (
      currentBlock <= actualEndBlock &&
      eventsCollected < maxNumberOfEvents
    ) {
      console.log(`Processing block ${currentBlock}...`);

      try {
        // Get block with transaction hashes
        const block = await provider.getBlock(currentBlock);

        if (!block || !block.transactions || block.transactions.length === 0) {
          console.log(`Block ${currentBlock} has no transactions`);
          currentBlock++;
          blocksStopped = currentBlock - 1;
          continue;
        }

        console.log(
          `Block ${currentBlock} has ${block.transactions.length} transactions`
        );

        // Get receipts for all transactions in the block
        const receipts = await Promise.all(
          block.transactions.map((txHash) =>
            provider.getTransactionReceipt(txHash).catch((err) => {
              console.warn(`Failed to get receipt for ${txHash}:`, err.message);
              return null;
            })
          )
        );

        // Filter receipts for transactions sent to the token address
        const relevantReceipts = receipts.filter(
          (receipt) =>
            receipt &&
            receipt.to &&
            receipt.to.toLowerCase() === tokenAddressLower
        );

        console.log(
          `Found ${relevantReceipts.length} transactions to token address in block ${currentBlock}`
        );

        // Process each relevant receipt
        for (const receipt of relevantReceipts) {
          if (eventsCollected >= maxNumberOfEvents) {
            blocksStopped = currentBlock;
            break;
          }

          // Filter logs for ERC20 Transfer events from this token
          const transferLogs = receipt.logs.filter(
            (log) => log.topics[0] === TRANSFER_TOPIC && log.topics.length >= 3
          );

          // Process each transfer event
          for (const log of transferLogs) {
            if (eventsCollected >= maxNumberOfEvents) {
              blocksStopped = currentBlock;
              break;
            }

            try {
              // Decode Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
              const fromAddress = ethers.getAddress(
                "0x" + log.topics[1].slice(26)
              );
              const toAddress = ethers.getAddress(
                "0x" + log.topics[2].slice(26)
              );
              if (!test) {
                const isRegisteredUser = await addressExists([
                  fromAddress,
                  toAddress,
                ]);
                if (!isRegisteredUser) {
                  continue;
                }
              }

              const amount = BigInt(log.data).toString();

              transferEvents.push({
                transactionHash: receipt.hash,
                blockNumber: currentBlock,
                blockTimestamp: block.timestamp,
                from: fromAddress,
                to: toAddress,
                amount: amount,
                logIndex: log.index,
              });

              eventsCollected++;
              console.log(
                `Collected transfer event ${eventsCollected}/${maxNumberOfEvents}`
              );
            } catch (decodeError) {
              console.error(
                `Error decoding transfer log in tx ${receipt.hash}:`,
                decodeError.message
              );
            }
          }

          if (eventsCollected >= maxNumberOfEvents) {
            break;
          }
        }

        // If we've collected enough events, stop
        if (eventsCollected >= maxNumberOfEvents) {
          blocksStopped = currentBlock;
          break;
        }

        currentBlock++;
        blocksStopped = currentBlock - 1;
      } catch (blockError) {
        console.error(
          `Error processing block ${currentBlock}:`,
          blockError.message
        );
        currentBlock++;
        blocksStopped = currentBlock - 1;
      }
    }

    return {
      success: true,
      tokenAddress: tokenAddress,
      startBlock: startBlock,
      endBlock: blocksStopped,
      totalEventsFound: transferEvents.length,
      events: transferEvents,
    };
  } catch (error) {
    console.error("Error monitoring token transfers:", error);
    throw error;
  } finally {
    provider.destroy();
  }
}

module.exports = {
  monitorTokenTransfers,
};
