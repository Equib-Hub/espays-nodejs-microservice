const express = require('express');
const walletGenerator = require('../services/walletGenerator');

const authMiddleware = express.Router();

authMiddleware.post('/create-wallet', async (req, res) => {
  try {
    const walletData = await walletGenerator.generateWallet(req.body);
    res.json({
      message: 'Wallet created successfully',
      wallet: walletData,
    });
  } catch (err) {
    console.error('[Wallet Creation Error]', err.message);
    res.status(500).json({ error: 'Wallet creation failed' });
  }
});

module.exports = authMiddleware;