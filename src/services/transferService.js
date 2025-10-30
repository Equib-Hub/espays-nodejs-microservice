const { ethers } = require('ethers');

// ERC20 ABI for transfer and balanceOf
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

/**
 * Transfer ERC20 tokens from one address to another
 * @param {Object} params - Transfer parameters
 * @param {string} params.privateKey - Private key of the sender
 * @param {string} params.tokenAddress - Address of the ERC20 token
 * @param {string} params.amount - Amount of tokens to transfer (in token units)
 * @param {string} params.toAddress - Recipient address
 * @param {string} params.rpcUrl - RPC URL for blockchain connection
 * @returns {Promise<Object>} Transfer result with balances and transaction info
 */
async function transferToken(params) {
  const {
    privateKey,
    tokenAddress,
    amount,
    toAddress,
    rpcUrl
  } = params;

  // Validate inputs
  if (!privateKey || privateKey.length !== 66) {
    throw new Error('Invalid private key');
  }
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    throw new Error('Invalid token address');
  }
  if (!toAddress || !ethers.isAddress(toAddress)) {
    throw new Error('Invalid recipient address');
  }
  if (!amount || parseFloat(amount) <= 0) {
    throw new Error('Invalid amount');
  }
  if (!rpcUrl) {
    throw new Error('RPC URL is required');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  try {
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey, provider);
    const fromAddress = wallet.address;

    // Create token contract instance
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    // Get token info
    const [decimals, symbol] = await Promise.all([
      tokenContract.decimals(),
      tokenContract.symbol()
    ]);

    // Convert amount to token units (with decimals)
    const amountInWei = ethers.parseUnits(amount, decimals);

    // Get balances before transfer
    const [fromBalanceBefore, toBalanceBefore] = await Promise.all([
      tokenContract.balanceOf(fromAddress),
      tokenContract.balanceOf(toAddress)
    ]);

    console.log(`Transferring ${amount} ${symbol} from ${fromAddress} to ${toAddress}`);
    console.log(`From balance before: ${ethers.formatUnits(fromBalanceBefore, decimals)} ${symbol}`);
    console.log(`To balance before: ${ethers.formatUnits(toBalanceBefore, decimals)} ${symbol}`);

    // Check if sender has enough balance
    if (fromBalanceBefore < amountInWei) {
      return {
        success: false,
        error: 'Insufficient balance',
        fromAddress: fromAddress,
        toAddress: toAddress,
        tokenAddress: tokenAddress,
        tokenSymbol: symbol,
        amount: amount,
        fromBalanceBefore: ethers.formatUnits(fromBalanceBefore, decimals),
        toBalanceBefore: ethers.formatUnits(toBalanceBefore, decimals)
      };
    }

    // Execute transfer
    const tx = await tokenContract.transfer(toAddress, amountInWei);
    console.log(`Transaction sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    // Get balances after transfer
    const [fromBalanceAfter, toBalanceAfter] = await Promise.all([
      tokenContract.balanceOf(fromAddress),
      tokenContract.balanceOf(toAddress)
    ]);

    console.log(`From balance after: ${ethers.formatUnits(fromBalanceAfter, decimals)} ${symbol}`);
    console.log(`To balance after: ${ethers.formatUnits(toBalanceAfter, decimals)} ${symbol}`);

    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber.toString(),
      fromAddress: fromAddress,
      toAddress: toAddress,
      tokenAddress: tokenAddress,
      tokenSymbol: symbol,
      tokenDecimals: decimals,
      amount: amount,
      balances: {
        from: {
          before: ethers.formatUnits(fromBalanceBefore, decimals),
          after: ethers.formatUnits(fromBalanceAfter, decimals)
        },
        to: {
          before: ethers.formatUnits(toBalanceBefore, decimals),
          after: ethers.formatUnits(toBalanceAfter, decimals)
        }
      },
      gasUsed: receipt.gasUsed.toString()
    };

  } catch (error) {
    console.error('Error transferring token:', error);
    throw error;
  } finally {
    provider.destroy();
  }
}

module.exports = {
  transferToken
};