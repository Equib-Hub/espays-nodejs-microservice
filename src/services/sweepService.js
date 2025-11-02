const { ethers } = require('ethers');

// ERC20 ABI
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Status codes
const STATUS = {
  SUCCESS: 0,
  FAILED: 1,
  NOT_UP_TO_MIN_BALANCE: 2
};

/**
 * Sweep tokens from multiple wallets to a hot wallet
 * @param {Object} params - Sweep parameters
 * @param {string[]} params.privateKeys - Array of private keys to sweep from
 * @param {string} params.tokenAddress - Address of the ERC20 token
 * @param {string} params.hotWalletAddress - Hot wallet address to receive tokens
 * @param {string} params.rpcUrl - RPC URL for blockchain connection
 * @returns {Promise<Object>} Sweep results with total amount and transaction details
 */
async function sweepTokens(params) {
  const {
    privateKeys,
    tokenAddress,
    hotWalletAddress,
    rpcUrl
  } = params;

  // Validate inputs
  if (!Array.isArray(privateKeys) || privateKeys.length === 0) {
    throw new Error('Private keys array is required');
  }
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    throw new Error('Invalid token address');
  }
  if (!hotWalletAddress || !ethers.isAddress(hotWalletAddress)) {
    throw new Error('Invalid hot wallet address');
  }
  if (!rpcUrl) {
    throw new Error('RPC URL is required');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const results = [];
  let totalSwept = BigInt(0);
  
  try {
    // Get token info
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const [decimals, symbol] = await Promise.all([
      tokenContract.decimals(),
      tokenContract.symbol()
    ]);


    console.log(`Starting sweep operation for ${symbol} token`);
    console.log(`Hot wallet: ${hotWalletAddress}`);
    console.log(`Processing ${privateKeys.length} wallets...`);

    // Get hot wallet balance before sweep
    const hotWalletBalanceBefore = await tokenContract.balanceOf(hotWalletAddress);

    // Process each private key
    for (let i = 0; i < privateKeys.length; i++) {
      const privateKey = privateKeys[i];
      const result = {
        index: i,
        status: null,
        transactionHash: null,
        fromAddress: null,
        amount: '0',
        error: null
      };

      try {
        // Validate private key format
        if (!privateKey || privateKey.length !== 66) {
          result.status = STATUS.FAILED;
          result.error = 'Invalid private key format';
          results.push(result);
          continue;
        }

        // Create wallet
        const wallet = new ethers.Wallet(privateKey, provider);
        result.fromAddress = wallet.address;

        // Check if trying to sweep from hot wallet itself
        if (wallet.address.toLowerCase() === hotWalletAddress.toLowerCase()) {
          result.status = STATUS.FAILED;
          result.error = 'Cannot sweep from hot wallet to itself';
          results.push(result);
          continue;
        }

        // Get balance
        const balance = await tokenContract.balanceOf(wallet.address);
        const balanceFormatted = ethers.formatUnits(balance, decimals);

        console.log(`Wallet ${i + 1}/${privateKeys.length} (${wallet.address}): ${balanceFormatted} ${symbol}`);

        // Check if balance is zero
        if (balance === BigInt(0)) {
          result.status = STATUS.NOT_UP_TO_MIN_BALANCE;
          result.amount = '0';
          result.error = 'Zero balance';
          results.push(result);
          continue;
        }

        // Prepare token contract with signer
        const tokenWithSigner = tokenContract.connect(wallet);

        // Transfer tokens to hot wallet
        const tx = await tokenWithSigner.transfer(hotWalletAddress, balance);
        console.log(`Transaction sent from ${wallet.address}: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

        result.status = STATUS.SUCCESS;
        result.transactionHash = tx.hash;
        result.amount = balanceFormatted;
        result.blockNumber = receipt.blockNumber;

        totalSwept += balance;

      } catch (error) {
        console.error(`Error processing wallet ${i + 1}:`, error.message);
        result.status = STATUS.FAILED;
        result.error = error.message;
      }

      results.push(result);
    }

    // Get hot wallet balance after sweep
    const hotWalletBalanceAfter = await tokenContract.balanceOf(hotWalletAddress);
    const totalSweptFormatted = ethers.formatUnits(totalSwept, decimals);

    console.log(`Sweep completed. Total swept: ${totalSweptFormatted} ${symbol}`);

    // Calculate statistics
    const successCount = results.filter(r => r.status === STATUS.SUCCESS).length;
    const failedCount = results.filter(r => r.status === STATUS.FAILED).length;
    const belowMinCount = results.filter(r => r.status === STATUS.NOT_UP_TO_MIN_BALANCE).length;

    return {
      success: true,
      tokenAddress: tokenAddress,
      tokenSymbol: symbol,
      tokenDecimals: decimals,
      hotWalletAddress: hotWalletAddress,
      totalAmountSwept: totalSweptFormatted,
      walletsProcessed: privateKeys.length,
      statistics: {
        successful: successCount,
        failed: failedCount,
        belowMinimum: belowMinCount
      },
      hotWalletBalance: {
        before: ethers.formatUnits(hotWalletBalanceBefore, decimals),
        after: ethers.formatUnits(hotWalletBalanceAfter, decimals)
      },
      results: results
    };

  } catch (error) {
    console.error('Error during sweep operation:', error);
    throw error;
  } finally {
    provider.destroy();
  }
}

module.exports = {
  sweepTokens,
  STATUS
};