const { monitorTokenTransfers } = require('../services/monitorService');

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
    const {
      tokenAddress,
      startBlock,
      numberOfBlocks,
      endBlock,
      rpcUrl,
      maxNumberOfEvents
    } = req.body;

    // Validate required fields
    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'tokenAddress is required'
      });
    }

    if (!startBlock || isNaN(startBlock)) {
      return res.status(400).json({
        success: false,
        error: 'startBlock is required and must be a number'
      });
    }

    if (!numberOfBlocks || isNaN(numberOfBlocks)) {
      return res.status(400).json({
        success: false,
        error: 'numberOfBlocks is required and must be a number'
      });
    }

    if (!rpcUrl) {
      return res.status(400).json({
        success: false,
        error: 'rpcUrl is required'
      });
    }

    if (!maxNumberOfEvents || isNaN(maxNumberOfEvents)) {
      return res.status(400).json({
        success: false,
        error: 'maxNumberOfEvents is required and must be a number'
      });
    }

    // Call service
    const result = await monitorTokenTransfers({
      tokenAddress,
      startBlock: parseInt(startBlock),
      numberOfBlocks: parseInt(numberOfBlocks),
      endBlock: endBlock ? parseInt(endBlock) : null,
      rpcUrl,
      maxNumberOfEvents: parseInt(maxNumberOfEvents)
    });

    res.json(result);

  } catch (error) {
    console.error('Monitor controller error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

module.exports = {
  monitor
};