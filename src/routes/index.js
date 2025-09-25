const express = require('express');
const walletRoutes = require('./wallet');

const router = express.Router();

router.use('/wallet', walletRoutes);

module.exports = router;