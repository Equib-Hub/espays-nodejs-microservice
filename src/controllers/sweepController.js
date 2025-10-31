const { sweepTokens } = require("../services/sweepService");
const { getWalletsByUserId, decryptString } = require("../utils/helpers");

/**
 * Sweep tokens endpoint
 * POST /api/sweep
 * Body: {
 *   userIds: string[],
 *   tokenAddress: string,
 *   minBalance: string,
 *   hotWalletAddress: string,
 *   rpcUrl: string
 * }
 */
async function sweep(req, res) {
  try {
    const { userIds, tokenAddress, minBalance, hotWalletAddress, rpcUrl } =
      req.body;

    const queryResult = await getWalletsByUserId(userIds);
    if (!queryResult.found) {
      return res.status(400).json({
        success: false,
        error: "no user not found",
      });
    }

    // Access the first private keys
    const privateKeys = queryResult.wallets
      .map((wallet) => decryptString(wallet.privateKey))
      .filter((keys) => Boolean(keys));

    // Validate required fields
    if (
      !privateKeys ||
      !Array.isArray(privateKeys) ||
      privateKeys.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "privateKeys is required and must be a non-empty array",
      });
    }

    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: "tokenAddress is required",
      });
    }

    if (!minBalance) {
      return res.status(400).json({
        success: false,
        error: "minBalance is required",
      });
    }

    if (!hotWalletAddress) {
      return res.status(400).json({
        success: false,
        error: "hotWalletAddress is required",
      });
    }

    if (!rpcUrl) {
      return res.status(400).json({
        success: false,
        error: "rpcUrl is required",
      });
    }

    // Call service
    const result = await sweepTokens({
      privateKeys,
      tokenAddress,
      minBalance,
      hotWalletAddress,
      rpcUrl,
    });

    res.json(result);
  } catch (error) {
    console.error("Sweep controller error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}

module.exports = {
  sweep,
};
