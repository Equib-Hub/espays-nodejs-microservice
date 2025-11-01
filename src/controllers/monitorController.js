const { monitorTokenTransfers } = require("../services/monitorService");
const axios = require("axios");
require("dotenv").config();
/**
 * Monitor token transfers endpoint
 * POST /api/monitor
 * Body: {
 *   tokenAddress: string,
 *   startBlock: number,
 *   numberOfBlocks: number,
 *   endBlock: number (optional),
 *   rpcUrl: string,
 *   maxNumberOfEvents: number
 * }
 */
async function monitor(req, res) {
  try {
    let {
      tokenAddress,
      startBlock,
      numberOfBlocks,
      endBlock,
      rpcUrl = process.env.TORONET_RPC || "https://toronet.org/rpc/",
      maxNumberOfEvents,
      webHook,
      test,
    } = req.body;

    if (!numberOfBlocks) numberOfBlocks = 100;
    // Validate required fields
    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: "tokenAddress is required",
      });
    }

    if (!startBlock || isNaN(startBlock)) {
      return res.status(400).json({
        success: false,
        error: "startBlock is required and must be a number",
      });
    }

    if (!numberOfBlocks || isNaN(numberOfBlocks)) {
      return res.status(400).json({
        success: false,
        error: "numberOfBlocks is required and must be a number",
      });
    }

    if (!rpcUrl) {
      return res.status(400).json({
        success: false,
        error: "rpcUrl is required",
      });
    }

    if (!maxNumberOfEvents || isNaN(maxNumberOfEvents)) {
      return res.status(400).json({
        success: false,
        error: "maxNumberOfEvents is required and must be a number",
      });
    }

    // Call service
    const result = await monitorTokenTransfers({
      tokenAddress,
      startBlock: parseInt(startBlock),
      numberOfBlocks: parseInt(numberOfBlocks),
      endBlock: endBlock ? parseInt(endBlock) : null,
      rpcUrl,
      maxNumberOfEvents: parseInt(maxNumberOfEvents),
      test,
    });
    if (webHook) {
      await axios.post(webHook, result).catch((err) => {
        throw err;
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Monitor controller error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}

module.exports = {
  monitor,
};
