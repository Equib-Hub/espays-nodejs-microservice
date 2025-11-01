const express = require('express');
const router = express.Router();

const { monitor } = require('../controllers/monitorController');
const { transfer } = require('../controllers/transferController');
const { sweep } = require('../controllers/sweepController');

// Monitor endpoint - scan blockchain for token transfers
// router.post('/monitor', monitor);

/**
 * @swagger
 * /api/blockchain/transfer:
 *   post:
 *     summary: Transfer tokens from one address to another
 *     description: Transfer cryptocurrency or tokens between addresses on supported blockchains
 *     tags:
 *       - Blockchain Operations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blockchain
 *               - fromAddress
 *               - toAddress
 *               - amount
 *             properties:
 *               blockchain:
 *                 type: string
 *                 enum: [bitcoin, ethereum, solana, ton, cosmos, polkadot, tezos, algorand, stellar]
 *                 description: The blockchain network to use
 *                 example: ethereum
 *               fromAddress:
 *                 type: string
 *                 description: Source wallet address
 *                 example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *               toAddress:
 *                 type: string
 *                 description: Destination wallet address
 *                 example: "0x8ba1f109551bD432803012645Ac136ddd64DBA72"
 *               amount:
 *                 type: string
 *                 description: Amount to transfer (in base units)
 *                 example: "1000000000000000000"
 *               privateKey:
 *                 type: string
 *                 description: Private key of the source address
 *               tokenAddress:
 *                 type: string
 *                 description: Token contract address (for token transfers)
 *     responses:
 *       200:
 *         description: Transfer successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 transactionHash:
 *                   type: string
 *                   example: "0x123abc..."
 *                 message:
 *                   type: string
 *                   example: "Transfer completed successfully"
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/transfer', transfer);

/**
 * @swagger
 * /api/blockchain/sweep:
 *   post:
 *     summary: Sweep tokens from multiple wallets to a hot wallet
 *     description: Consolidate funds from multiple source wallets into a single destination wallet
 *     tags:
 *       - Blockchain Operations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blockchain
 *               - sourceWallets
 *               - destinationAddress
 *             properties:
 *               blockchain:
 *                 type: string
 *                 enum: [bitcoin, ethereum, solana, ton, cosmos, polkadot, tezos, algorand, stellar]
 *                 description: The blockchain network to use
 *                 example: ethereum
 *               sourceWallets:
 *                 type: array
 *                 description: Array of source wallet addresses with their private keys
 *                 items:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                     privateKey:
 *                       type: string
 *               destinationAddress:
 *                 type: string
 *                 description: Hot wallet address to receive all funds
 *                 example: "0x8ba1f109551bD432803012645Ac136ddd64DBA72"
 *               minAmount:
 *                 type: string
 *                 description: Minimum balance required to trigger sweep
 *               tokenAddress:
 *                 type: string
 *                 description: Token contract address (for token sweeps)
 *     responses:
 *       200:
 *         description: Sweep operation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       address:
 *                         type: string
 *                       transactionHash:
 *                         type: string
 *                       amount:
 *                         type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/sweep', sweep);

/**
 * @swagger
 * /api/blockchain/health:
 *   get:
 *     summary: API health check
 *     description: Check if the blockchain API service is running
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: API is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-11-01T12:00:00.000Z"
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;