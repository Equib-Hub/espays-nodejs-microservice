# Wallet Middleware Service

## Overview
The Wallet Middleware Service is a Node.js application that provides an API for generating and managing cryptocurrency wallets across multiple blockchains. This service is designed to be integrated with a Laravel backend, allowing seamless wallet creation and retrieval of wallet information in JSON format.

## Features
- Generate wallets for various blockchains including Bitcoin, Ethereum, Solana, TON, Cosmos, Polkadot, Tezos, Algorand, and Stellar.
- Return wallet information as JSON without saving to files.
- Middleware for authentication, validation, and error handling.
- Easy integration with Laravel or any other backend framework.

## Project Structure
```
wallet-middleware-service
├── src
│   ├── app.js                  # Entry point of the application
│   ├── controllers             # Contains controllers for handling requests
│   │   └── walletController.js  # Wallet controller for wallet operations
│   ├── services                # Contains services for wallet generation
│   │   ├── walletGenerator.js   # Main wallet generation logic
│   │   ├── blockchainServices    # Specific services for each blockchain
│   │   │   ├── bitcoinService.js
│   │   │   ├── ethereumService.js
│   │   │   ├── solanaService.js
│   │   │   ├── tonService.js
│   │   │   ├── cosmosService.js
│   │   │   ├── polkadotService.js
│   │   │   ├── tezosService.js
│   │   │   ├── algorandService.js
│   │   │   └── stellarService.js
│   │   └── index.js            # Exports all services for easy access
│   ├── middleware              # Middleware for handling requests
│   │   ├── auth.js             # Authentication middleware
│   │   ├── validation.js        # Validation middleware
│   │   └── errorHandler.js      # Error handling middleware
│   ├── routes                  # Contains route definitions
│   │   ├── wallet.js           # Wallet-related routes
│   │   └── index.js            # Main routing setup
│   ├── utils                   # Utility functions
│   │   ├── logger.js           # Logging utility
│   │   └── helpers.js          # Helper functions
│   └── config                  # Configuration files
│       ├── database.js         # Database configuration (if applicable)
│       └── environment.js      # Environment variable configurations
├── tests                       # Contains tests for the application
│   ├── controllers             # Tests for controllers
│   │   └── walletController.test.js
│   ├── services                # Tests for services
│   │   └── walletGenerator.test.js
│   └── setup.js                # Testing environment setup
├── package.json                # NPM configuration file
├── .env.example                # Example environment variables
├── .gitignore                  # Files to ignore in Git
├── docker-compose.yml          # Docker configurations
├── Dockerfile                  # Docker image build instructions
└── README.md                   # Project documentation
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd wallet-middleware-service
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` and configure your environment variables.

4. Start the application:
   ```
   npm start
   ```

## API Endpoints
- `POST /create-wallet`: Generates a new wallet and returns wallet information as JSON.

## PM2 Process Management

### Check Running Processes

```bash
# List all PM2 processes with status
pm2 list

# Or detailed view
pm2 status
```

You should see both processes running:
- `espays-api` (or `wallet-api`)
- `espays-blockmonitor` (or `blockchain-monitor`)

### Monitor Blockchain Scanner

```bash
# View real-time logs from the monitor
pm2 logs espays-blockmonitor --lines 100

# View only monitor logs (no API logs)
pm2 logs espays-blockmonitor

# Check if monitor is processing blocks
pm2 logs espays-blockmonitor | grep "Processing block"

# Check for recent transfer detections
pm2 logs espays-blockmonitor | grep "Found"

# View error logs only
pm2 logs espays-blockmonitor --err

# Follow logs in real-time
pm2 logs espays-blockmonitor -f
```

### Check Monitor Health

```bash
# Check process uptime and restarts
pm2 info espays-blockmonitor

# View process metrics
pm2 monit

# Check memory and CPU usage
pm2 describe espays-blockmonitor
```

### Verify Database State

```bash
# Connect to PostgreSQL and check last processed block
psql -h $DB_HOST -U $DB_USER -d $DB_DATABASE -c "SELECT * FROM blockchain_data WHERE name = 'last_processed_block';"

# Check when it was last updated
psql -h $DB_HOST -U $DB_USER -d $DB_DATABASE -c "SELECT name, data->>'blockNumber' as block, updated_at FROM blockchain_data WHERE name = 'last_processed_block';"
```

### Common PM2 Commands

```bash
# Restart monitor if needed
pm2 restart espays-blockmonitor

# Stop monitor temporarily
pm2 stop espays-blockmonitor

# Start monitor
pm2 start espays-blockmonitor

# Delete and restart
pm2 delete espays-blockmonitor
pm2 start ecosystem.config.js --only espays-blockmonitor

# View full process details
pm2 show espays-blockmonitor

# Clear logs
pm2 flush espays-blockmonitor
```

### Troubleshooting

If the monitor is not working:

```bash
# Check for errors
pm2 logs espays-blockmonitor --err --lines 50

# Check environment variables are loaded
pm2 env espays-blockmonitor

# Restart with logs
pm2 restart espays-blockmonitor && pm2 logs espays-blockmonitor

# Check if port conflicts exist
pm2 list
netstat -tuln | grep 3000
```

### Monitor Performance

```bash
# Real-time monitoring dashboard
pm2 monit

# Get JSON format status
pm2 jlist

# Check process metrics
pm2 describe espays-blockmonitor --json
```

## Testing
Run the tests using:
```
npm test
```

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.