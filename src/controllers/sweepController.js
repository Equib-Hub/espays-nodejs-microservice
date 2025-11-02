const { sweepTokens } = require("../services/sweepService");
const {
  getWalletsByUserId,
  decryptString,
  getHotWalletAddress,
} = require("../utils/helpers");
require("dotenv").config();

/**
 * Sweep tokens endpoint
 * POST /api/sweep
 * Body: {
 *   userIds: string[],
 *   test: boolean(optional)
 * }
 */
async function sweep(req, res) {
  try {
    const { userIds, test, assetId } = req.body;

    if (!assetId) {
      throw new Error("No asset id");
    }

    const tokenAddress =
        process.env.WATCHED_ADDRESS ||
        "0x241178EcC063f6DB8626c471Ee61A63644BF95A3",
      rpcUrl = process.env.TORONET_RPC || "https://toronet.org/rpc/";

    const hotWalletAddress = await getHotWalletAddress(assetId);

    if (!hotWalletAddress) {
      throw new Error("No hotwallet address");
    }
    let privateKeys = [];
    if (test) {
      privateKeys = userIds;
    } else {
      const queryResult = await getWalletsByUserId(userIds);
      if (!queryResult.found) {
        return res.status(400).json({
          success: false,
          error: "no user not found",
        });
      }

      // Access the first private keys
      privateKeys = queryResult.wallets
        .map((wallet) => decryptString(wallet.privateKey))
        .filter((keys) => Boolean(keys));
    }

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
    privateKeys.map((key) => (!key.startsWith("0x") ? "0x" + key : key));

    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: "tokenAddress is required",
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
