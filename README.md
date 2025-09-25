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

## Testing
Run the tests using:
```
npm test
```

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.