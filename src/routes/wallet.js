const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

/**
 * @swagger
 * /api/wallet/create-wallet:
 *   post:
 *     summary: Create a new wallet
 *     responses:
 *       200:
 *         description: Wallet created successfully
 */
router.post('/create-wallet', walletController.createWallet);

module.exports = router;