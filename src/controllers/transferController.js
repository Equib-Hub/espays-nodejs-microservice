const { transferToken } = require("../services/transferService");
const { getHotWalletKey } = require("../utils/helpers");
require("dotenv").config();

/**
 * Transfer token endpoint
 * POST /api/transfer
 * Body: {
 *   amount: string,
 *   toAddress: string,
 *   privateKey: string(optional),
 *   test: boolean(optional)
 * }
 */
async function transfer(req, res) {
  try {
    const { assetId, amount, toAddress, test } = req.body;

    let { privateKey } = req.body;

    if (!assetId) {
      throw new Error("No asset id");
    }
    if (!test) {
      privateKey = await getHotWalletKey(assetId);
    }
    const tokenAddress =
        process.env.WATCHED_ADDRESS ||
        "0x241178EcC063f6DB8626c471Ee61A63644BF95A3",
      rpcUrl = process.env.TORONET_RPC || "https://toronet.org/rpc/";

    // Validate required fields
    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: "privateKey is required",
      });
    }

    if (!privateKey.startsWith("0x")) {
      privateKey = "0x" + privateKey;
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
