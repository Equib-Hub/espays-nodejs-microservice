const bip39 = require("bip39");
const ecc = require("tiny-secp256k1");
const bip32 = require("bip32");
const bitcoin = require("bitcoinjs-lib");
const solanaWeb3 = require("@solana/web3.js");
const { TonClient, WalletContractV4, internal } = require("@ton/ton");
const { mnemonicNew, mnemonicToPrivateKey } = require("@ton/crypto");
const { Secp256k1HdWallet, Slip10RawIndex } = require("@cosmjs/amino");
const { Keyring } = require("@polkadot/keyring");
const { InMemorySigner } = require("@taquito/signer");
const algosdk = require("algosdk");
const StellarHDWallet = require("stellar-hd-wallet");

const CryptoJS = require("crypto-js");

// Using pg (node-postgres) library
const { Pool } = require("pg");
require("dotenv").config();

const generateWallets = async (mnemonic) => {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const wallets = {};

  // Bitcoin Wallet
  const root = bip32.BIP32Factory(ecc).fromSeed(seed);
  const btcNode = root.derivePath("m/84'/0'/0'/0/0");
  wallets.bitcoin = {
    privateKey: btcNode.toWIF(),
    address: bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(btcNode.publicKey),
      network: bitcoin.networks.bitcoin,
    }).address,
  };

  // Ethereum Wallet
  const ethWallet = new ethers.Wallet.fromMnemonic(mnemonic);
  wallets.ethereum = {
    privateKey: ethWallet.privateKey,
    address: ethWallet.address,
  };

  // Solana Wallet
  const solSeed = seed.slice(0, 32);
  const solKeypair = solanaWeb3.Keypair.fromSeed(solSeed);
  wallets.solana = {
    privateKey: Buffer.from(solKeypair.secretKey).toString("hex"),
    address: solKeypair.publicKey.toBase58(),
  };

  // TON Wallet
  const keyPair = await mnemonicToPrivateKey(await mnemonicNew());
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });
  const client = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC",
  });
  wallets.ton = {
    privateKey: keyPair.secretKey.toString("hex"),
    publicKey: keyPair.publicKey.toString("hex"),
    address: (await client.open(wallet)).address.toString(),
  };

  // Cosmos Wallet
  const cosmosWallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: "cosmos",
    hdPaths: [
      [
        Slip10RawIndex.hardened(44),
        Slip10RawIndex.hardened(118),
        Slip10RawIndex.hardened(0),
        Slip10RawIndex.normal(0),
        Slip10RawIndex.normal(0),
      ],
    ],
  });
  const [{ address: cosmosAddress, privkey: cosmosPrivateKeyRaw }] =
    await cosmosWallet.getAccountsWithPrivkeys();
  wallets.cosmos = {
    privateKey: Buffer.from(cosmosPrivateKeyRaw).toString("hex"),
    address: cosmosAddress,
  };

  // Polkadot Wallet
  const keyring = new Keyring({ type: "sr25519" });
  const polkadotSeed = mnemonicToMiniSecret(mnemonic);
  const { publicKey, secretKey } = sr25519PairFromSeed(polkadotSeed);
  wallets.polkadot = {
    privateKey: Buffer.from(secretKey).toString("hex"),
    address: keyring.encodeAddress(publicKey),
  };

  // Algorand Wallet
  const algorandAccount = algosdk.generateAccount();
  wallets.algorand = {
    privateKey: Buffer.from(algorandAccount.sk).toString("hex"),
    address: algorandAccount.addr.toString(),
  };

  // Tezos Wallet
  const signer = await InMemorySigner.fromMnemonic({ mnemonic });
  wallets.tezos = {
    privateKey: await signer.secretKey(),
    address: await signer.publicKeyHash(),
  };

  // Stellar Wallet
  const stellarWallet = StellarHDWallet.default.fromSeed(seed);
  wallets.stellar = {
    privateKey: stellarWallet.getSecret(0),
    address: stellarWallet.getPublicKey(0),
  };

  return wallets;
};

// Configure your database connection from environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Gracefully close the database pool
 */
async function closePool() {
  try {
    await pool.end();
    console.log("Database pool closed successfully");
  } catch (error) {
    console.error("Error closing database pool:", error);
    throw error;
  }
}

// Handle graceful shutdown on different signals
process.on("SIGINT", async () => {
  console.log("SIGINT received, closing database pool...");
  await closePool();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing database pool...");
  await closePool();
  process.exit(0);
});

process.on("exit", () => {
  console.log("Process exiting...");
});

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("Uncaught Exception:", error);
  await closePool();
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  await closePool();
  process.exit(1);
});

/**
 * Check if a wallet address or multiple addresses exist in the database
 * @param {string|string[]} address - Single address or array of addresses to check
 * @returns {Promise<Object>} - Returns object with exists boolean and wallet data if found
 */
async function checkAddressExists(address) {
  try {
    // Handle array of addresses
    if (Array.isArray(address)) {
      if (address.length === 0) {
        throw new Error("Address array cannot be empty");
      }

      // Validate all addresses
      if (!address.every((addr) => addr && typeof addr === "string")) {
        throw new Error("All addresses must be valid strings");
      }

      const query = `
        SELECT 
          id, 
          user_id, 
          compatibility_id, 
          address, 
          status,
          created_at,
          updated_at
        FROM public.wallets 
        WHERE address = ANY($1)
      `;

      const result = await pool.query(query, [address]);

      return {
        exists: result.rows.length > 0,
        count: result.rows.length,
        wallets: result.rows,
        foundAddresses: result.rows.map((row) => row.address),
        notFoundAddresses: address.filter(
          (addr) => !result.rows.some((row) => row.address === addr)
        ),
      };
    }

    // Handle single address
    if (!address || typeof address !== "string") {
      throw new Error("Invalid address provided");
    }

    const query = `
      SELECT 
        id, 
        user_id, 
        compatibility_id, 
        address, 
        status,
        created_at,
        updated_at
      FROM public.wallets 
      WHERE address = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [address]);

    if (result.rows.length > 0) {
      return {
        exists: true,
        wallet: result.rows[0],
      };
    }

    return {
      exists: false,
      wallet: null,
    };
  } catch (error) {
    console.error("Error checking address:", error);
    throw error;
  }
}

/**
 * Alternative: Check if address(es) exist (returns only boolean or count)
 * @param {string|string[]} address - Single address or array of addresses to check
 * @returns {Promise<boolean|number>} - Returns true/false for single address, count for array
 */
async function addressExists(address) {
  try {
    // Handle array of addresses
    if (Array.isArray(address)) {
      if (address.length === 0) {
        throw new Error("Address array cannot be empty");
      }

      if (!address.every((addr) => addr && typeof addr === "string")) {
        throw new Error("All addresses must be valid strings");
      }

      const query = `
        SELECT COUNT(*) as count
        FROM public.wallets 
        WHERE address = ANY($1)
      `;

      const result = await pool.query(query, [address]);
      return parseInt(result.rows[0].count);
    }

    // Handle single address
    if (!address || typeof address !== "string") {
      throw new Error("Invalid address provided");
    }

    const query = `
      SELECT EXISTS(
        SELECT 1 
        FROM public.wallets 
        WHERE address = $1
      ) as exists
    `;

    const result = await pool.query(query, [address]);
    return result.rows[0].exists;
  } catch (error) {
    console.error("Error checking address:", error);
    throw error;
  }
}

/**
 * Get wallets by user_id or multiple user_ids
 * @param {string|string[]} userId - Single user_id or array of user_ids
 * @returns {Promise<Object>} - Returns object with wallet data including private and public keys
 */
async function getWalletsByUserId(userId) {
  try {
    // Handle array of user_ids
    if (Array.isArray(userId)) {
      if (userId.length === 0) {
        throw new Error("User ID array cannot be empty");
      }

      // Validate all user_ids
      if (!userId.every((id) => id && typeof id === "string")) {
        throw new Error("All user IDs must be valid strings");
      }

      const query = `
        SELECT 
          id, 
          user_id, 
          compatibility_id, 
          address,
          "publicKey",
          "privateKey",
          mnemonics,
          keys,
          memo,
          status,
          created_at,
          updated_at
        FROM public.wallets 
        WHERE user_id = ANY($1)
        ORDER BY user_id, created_at DESC
      `;

      const result = await pool.query(query, [userId]);

      // Group wallets by user_id
      const walletsByUser = {};
      userId.forEach((id) => {
        walletsByUser[id] = result.rows.filter((row) => row.user_id === id);
      });

      return {
        found: result.rows.length > 0,
        count: result.rows.length,
        wallets: result.rows,
        walletsByUser: walletsByUser,
        userIdsFound: [...new Set(result.rows.map((row) => row.user_id))],
        userIdsNotFound: userId.filter(
          (id) => !result.rows.some((row) => row.user_id === id)
        ),
      };
    }

    // Handle single user_id
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid user ID provided");
    }

    const query = `
      SELECT 
        id, 
        user_id, 
        compatibility_id, 
        address,
        "publicKey",
        "privateKey",
        mnemonics,
        keys,
        memo,
        status,
        created_at,
        updated_at
      FROM public.wallets 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    return {
      found: result.rows.length > 0,
      count: result.rows.length,
      wallets: result.rows,
    };
  } catch (error) {
    console.error("Error getting wallets by user ID:", error);
    throw error;
  }
}



/**
 * Encrypts a string using AES-GCM with a password-derived key
 * @param {string} text - The text to encrypt
 * @param {string} salt - The salt/password to use for encryption (optional, falls back to ENCRYPTION_SALT from .env)
 * @returns {Promise<string>} Base64 encoded encrypted data with IV
 */
function encryptString(text, salt) {
  try {
    if (typeof text === "object") {
      text = text.join(" ");
    }
    // Use provided salt or fall back to environment variable
    const encryptionSalt = salt || process.env.ENCRYPTION_SALT;
    if (!encryptionSalt) {
      throw new Error(
        "Salt is required. Provide a salt parameter or set ENCRYPTION_SALT in .env file"
      );
    }
    // Convert to base64
    const encryptedText = CryptoJS.AES.encrypt(text, encryptionSalt);
    return encryptedText.toString();
  } catch (error) {
    throw error;
  }
}

/**
 * Decrypts a string encrypted with encryptString
 * @param {string} encryptedText - Base64 encoded encrypted data
 * @param {string} salt - The salt/password used for encryption (optional, falls back to ENCRYPTION_SALT from .env)
 * @returns {Promise<string>} The decrypted text
 */
function decryptString(encryptedText, salt) {
  if (encryptedText.length == 0) return encryptedText;
  // Use provided salt or fall back to environment variable
  const encryptionSalt = salt || process.env.ENCRYPTION_SALT;

  if (!encryptionSalt) {
    throw new Error(
      "Salt is required. Provide a salt parameter or set ENCRYPTION_SALT in .env file"
    );
  }

  const decrypted = CryptoJS.AES.decrypt(encryptedText, encryptionSalt)
    .toString(CryptoJS.enc.Utf8)
    .toString();
  return decrypted;
}

// Export functions
module.exports = {
  generateWallets,
  checkAddressExists,
  getWalletsByUserId,
  addressExists,
  encryptString,
  decryptString,
};
