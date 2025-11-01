const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

/**
 * @swagger
 * /api/wallet/create-wallet:
 *   post:
 *     summary: Create a new multi-chain cryptocurrency wallet
 *     description: Generate wallet addresses and private keys for multiple blockchain networks from a single mnemonic phrase
 *     tags:
 *       - Wallet Management
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mnemonic:
 *                 type: string
 *                 description: Optional BIP39 mnemonic phrase (12 or 24 words). If not provided, a new one will be generated
 *                 example: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
 *     responses:
 *       200:
 *         description: Wallet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mnemonic:
 *                   type: string
 *                   description: BIP39 mnemonic phrase (12 words)
 *                   example: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
 *                 wallets:
 *                   type: object
 *                   properties:
 *                     bitcoin:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           example: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
 *                         privateKey:
 *                           type: string
 *                           example: "L1aW4aubDFB7yfras2S1mN3bqg9nwySY8nkoLmJebSLD5BWv3ENZ"
 *                         publicKey:
 *                           type: string
 *                           example: "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd"
 *                     ethereum:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *                         privateKey:
 *                           type: string
 *                           example: "0x1234567890abcdef..."
 *                         publicKey:
 *                           type: string
 *                           example: "0x04a34b99f22c790..."
 *                     solana:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           example: "7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv"
 *                         privateKey:
 *                           type: string
 *                           example: "[1,2,3,4,5...]"
 *                         publicKey:
 *                           type: string
 *                           example: "7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv"
 *                     ton:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           example: "EQD..."
 *                         privateKey:
 *                           type: string
 *                         publicKey:
 *                           type: string
 *                     cosmos:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           example: "cosmos1..."
 *                         privateKey:
 *                           type: string
 *                         publicKey:
 *                           type: string
 *                     polkadot:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           example: "15oF4..."
 *                         privateKey:
 *                           type: string
 *                         publicKey:
 *                           type: string
 *                     tezos:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           example: "tz1..."
 *                         privateKey:
 *                           type: string
 *                         publicKey:
 *                           type: string
 *                     algorand:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           example: "ALGO..."
 *                         privateKey:
 *                           type: string
 *                         publicKey:
 *                           type: string
 *                     stellar:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           example: "GDRXE..."
 *                         privateKey:
 *                           type: string
 *                         publicKey:
 *                           type: string
 *       400:
 *         description: Invalid mnemonic phrase provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid mnemonic phrase"
 *       500:
 *         description: Server error during wallet generation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Error generating wallet"
 */
router.post('/create-wallet', walletController.createWallet);

module.exports = router;