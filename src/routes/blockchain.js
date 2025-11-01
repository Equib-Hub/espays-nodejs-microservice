const express = require('express');
const router = express.Router();

const { monitor } = require('../controllers/monitorController');
const { transfer } = require('../controllers/transferController');
const { sweep } = require('../controllers/sweepController');

// Monitor endpoint - scan blockchain for token transfers
// router.post('/monitor', monitor);

// Transfer endpoint - transfer tokens from one address to another
router.post('/transfer', transfer);

// Sweep endpoint - sweep tokens from multiple wallets to hot wallet
router.post('/sweep', sweep);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;