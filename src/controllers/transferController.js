const { transferToken } = require("../services/transferService");
const { getWalletsByUserId } = require("../utils/helpers");

/**
 * Transfer token endpoint
 * POST /api/transfer
 * Body: {
 *   userId: string,
 *   tokenAddress: string,
 *   amount: string,
 *   toAddress: string,
 *   rpcUrl: string
 * }
 */
async function transfer(req, res) {
  try {
    const { userId, tokenAddress, amount, toAddress, rpcUrl } = req.body;

    const queryResult = await getWalletsByUserId(userId);
    if (!queryResult.found) {
      return res.status(400).json({
        success: false,
        error: "user not found",
      });
    }

    // Access the first wallet's private key
    const privateKey = queryResult.wallets[0].privateKey;

    // Validate required fields
    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: "privateKey is required",
      });
    }

    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: "tokenAddress is required",
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: "amount is required",
      });
    }

    if (!toAddress) {
      return res.status(400).json({
        success: false,
        error: "toAddress is required",
      });
    }

    if (!rpcUrl) {
      return res.status(400).json({
        success: false,
        error: "rpcUrl is required",
      });
    }

    // Call service
    const result = await transferToken({
      privateKey,
      tokenAddress,
      amount,
      toAddress,
      rpcUrl,
    });

    res.json(result);
  } catch (error) {
    console.error("Transfer controller error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}

module.exports = {
  transfer,
};
