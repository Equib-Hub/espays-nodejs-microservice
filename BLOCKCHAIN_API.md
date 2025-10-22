# EVM Blockchain API

A Node.js REST API for monitoring ERC20 token transfers, transferring tokens, and sweeping tokens from multiple wallets.

## Features

- 📊 **Monitor** - Scan blockchain for ERC20 token transfer events
- 💸 **Transfer** - Transfer ERC20 tokens with balance tracking
- 🧹 **Sweep** - Sweep tokens from multiple wallets to a hot wallet

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```bash
PORT=3000
DEFAULT_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
```

## Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### 1. Monitor Token Transfers

Scans blockchain for ERC20 token transfer events.

**Endpoint:** `POST /api/blockchain/monitor`

**Request Body:**
```json
{
  "tokenAddress": "0x...",
  "startBlock": 24251141,
  "numberOfBlocks": 1000,
  "endBlock": 24253141,
  "rpcUrl": "https://toronet.org/rpc/",
  "maxNumberOfEvents": 100
}
```

**Parameters:**
- `tokenAddress` (required) - ERC20 token contract address
- `startBlock` (required) - Block number to start scanning from
- `numberOfBlocks` (required) - Maximum number of blocks to scan
- `endBlock` (optional) - Block number to stop at (will use latest if not provided)
- `rpcUrl` (required) - Blockchain RPC URL
- `maxNumberOfEvents` (required) - Maximum number of transfer events to return

**Response:**
```json
{
  "success": true,
  "tokenAddress": "0x...",
  "tokenSymbol": "USDT",
  "tokenDecimals": 6,
  "startBlock": 18000000,
  "endBlock": 18000500,
  "totalEventsFound": 50,
  "events": [
    {
      "transactionHash": "0x...",
      "blockNumber": 18000100,
      "blockTimestamp": 1699000000,
      "from": "0x...",
      "to": "0x...",
      "amount": "1000000000",
      "logIndex": 5
    }
  ]
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/blockchain/monitor \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "startBlock": 18000000,
    "numberOfBlocks": 1000,
    "rpcUrl": "https://toronet.org/rpc/",
    "maxNumberOfEvents": 10
  }'
```

---

### 2. Transfer Token

Transfers ERC20 tokens from one address to another with balance tracking.

**Endpoint:** `POST /api/blockchain/transfer`

**Request Body:**
```json
{
  "privateKey": "0x...",
  "tokenAddress": "0x...",
  "amount": "100.5",
  "toAddress": "0x...",
  "rpcUrl": "https://toronet.org/rpc/"
}
```

**Parameters:**
- `privateKey` (required) - Private key of the sender (66 characters with 0x prefix)
- `tokenAddress` (required) - ERC20 token contract address
- `amount` (required) - Amount to transfer (in token units, e.g., "100.5" for 100.5 tokens)
- `toAddress` (required) - Recipient address
- `rpcUrl` (required) - Blockchain RPC URL

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 18000123,
  "fromAddress": "0x...",
  "toAddress": "0x...",
  "tokenAddress": "0x...",
  "tokenSymbol": "USDT",
  "tokenDecimals": 6,
  "amount": "100.5",
  "balances": {
    "from": {
      "before": "500.0",
      "after": "399.5"
    },
    "to": {
      "before": "200.0",
      "after": "300.5"
    }
  },
  "gasUsed": "65000"
}
```

**Error Response (Insufficient Balance):**
```json
{
  "success": false,
  "error": "Insufficient balance",
  "fromAddress": "0x...",
  "toAddress": "0x...",
  "tokenAddress": "0x...",
  "tokenSymbol": "USDT",
  "amount": "100.5",
  "fromBalanceBefore": "50.0",
  "toBalanceBefore": "200.0"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/blockchain/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "0x1234567890abcdef...",
    "tokenAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "amount": "10",
    "toAddress": "0xRecipientAddress...",
    "rpcUrl": "https://toronet.org/rpc/"
  }'
```

---

### 3. Sweep Tokens

Sweeps tokens from multiple wallets to a hot wallet address.

**Endpoint:** `POST /api/blockchain/sweep`

**Request Body:**
```json
{
  "privateKeys": [
    "0x...",
    "0x...",
    "0x..."
  ],
  "tokenAddress": "0x...",
  "minBalance": "10",
  "hotWalletAddress": "0x...",
  "rpcUrl": "https://toronet.org/rpc/"
}
```

**Parameters:**
- `privateKeys` (required) - Array of private keys to sweep from
- `tokenAddress` (required) - ERC20 token contract address
- `minBalance` (required) - Minimum balance required to sweep (in token units)
- `hotWalletAddress` (required) - Hot wallet address to receive all tokens
- `rpcUrl` (required) - Blockchain RPC URL

**Response:**
```json
{
  "success": true,
  "tokenAddress": "0x...",
  "tokenSymbol": "USDT",
  "tokenDecimals": 6,
  "hotWalletAddress": "0x...",
  "totalAmountSwept": "350.75",
  "walletsProcessed": 3,
  "statistics": {
    "successful": 2,
    "failed": 0,
    "belowMinimum": 1
  },
  "hotWalletBalance": {
    "before": "1000.0",
    "after": "1350.75"
  },
  "results": [
    {
      "index": 0,
      "status": 0,
      "transactionHash": "0x...",
      "fromAddress": "0x...",
      "amount": "150.5",
      "blockNumber": 18000125
    },
    {
      "index": 1,
      "status": 0,
      "transactionHash": "0x...",
      "fromAddress": "0x...",
      "amount": "200.25",
      "blockNumber": 18000126
    },
    {
      "index": 2,
      "status": 2,
      "transactionHash": null,
      "fromAddress": "0x...",
      "amount": "5.0",
      "error": "Balance 5.0 is below minimum 10"
    }
  ]
}
```

**Status Codes:**
- `0` - SUCCESS - Transfer completed successfully
- `1` - FAILED - Transfer failed due to error
- `2` - NOT_UP_TO_MIN_BALANCE - Balance below minimum threshold

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/blockchain/sweep \
  -H "Content-Type: application/json" \
  -d '{
    "privateKeys": [
      "0x1234567890abcdef...",
      "0xabcdef1234567890...",
      "0x567890abcdef1234..."
    ],
    "tokenAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "minBalance": "10",
    "hotWalletAddress": "0xHotWalletAddress...",
    "rpcUrl": "https://toronet.org/rpc/"
  }'
```

---

### 4. Health Check

**Endpoint:** `GET /api/blockchain/health`

**Response:**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Important Notes

### Security

⚠️ **CRITICAL**: Never expose private keys in production!

- Store private keys securely (environment variables, secrets manager)
- Use HTTPS in production
- Implement authentication/authorization
- Rate limit API endpoints
- Validate all inputs
- Log security events

### Gas Fees

- Ensure wallets have sufficient native currency (ETH, BNB, etc.) for gas fees
- Transfer and sweep operations require gas
- Gas fees vary based on network congestion

### RPC Considerations

- Use reliable RPC providers (Infura, Alchemy, QuickNode)
- Implement rate limiting to avoid hitting RPC limits
- Consider using multiple RPC endpoints for failover
- Archive nodes required for historical data scanning

### Token Decimals

- Amounts are specified in token units (human-readable)
- The API automatically handles decimal conversion
- Example: "100.5" USDT (6 decimals) = 100500000 base units

### Error Handling

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (validation error)
- `500` - Internal server error

## Testing

### Using Postman

1. Import the endpoints into Postman
2. Set up environment variables for RPC URL and token addresses
3. Test with testnet first (Sepolia, Mumbai, etc.)

### Using cURL

See examples above for each endpoint.

### Test on Testnet

Before using on mainnet, test on testnets:
- Ethereum Sepolia
- Polygon Mumbai
- BSC Testnet

Get testnet tokens from faucets.

## Production Deployment

1. **Environment Variables:**
   ```bash
   NODE_ENV=production
   PORT=3000
   DEFAULT_RPC_URL=your_production_rpc
   ```

2. **Security Hardening:**
   - Enable HTTPS
   - Implement authentication (JWT, API keys)
   - Rate limiting
   - Input sanitization
   - Firewall rules

3. **Monitoring:**
   - Log all transactions
   - Monitor RPC endpoint health
   - Track error rates
   - Set up alerts

4. **Process Management:**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start src/index.js --name evm-api
   pm2 startup
   pm2 save
   ```

## Troubleshooting

### "Insufficient funds for gas"
- Ensure sender wallet has native currency (ETH, BNB, etc.)

### "Insufficient balance"
- Check token balance is sufficient
- Verify token address is correct

### "Invalid private key"
- Ensure private key is 66 characters (including 0x prefix)
- Verify private key format

### RPC timeouts
- Try a different RPC endpoint
- Reduce batch size for monitoring
- Check RPC rate limits

## License



## Support

For issues and questions, please open an issue on the repository.