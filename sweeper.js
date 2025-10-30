const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const Web3 = require("web3");
const Tx = require("ethereumjs-tx").Transaction;
const Common = require("ethereumjs-common").default;

// === Load master wallet from root .env ===
require("dotenv").config();
const masterWallet = process.env.MASTER_WALLET;

// === STEP 1: Resolve input ===
let inputPath = process.argv[2];
if (!inputPath) {
  console.error("❌ Usage: node sweeper.js wallets/user_X");
  process.exit(1);
}

let envFilePath = path.resolve(inputPath);

// === STEP 2: If input is a folder, use 'env' file inside ===
try {
  const stat = fs.statSync(envFilePath);
  if (stat.isDirectory()) {
    envFilePath = path.join(envFilePath, "env");
  }
} catch (e) {
  console.error("❌ Invalid path:", e.message);
  process.exit(1);
}

// === STEP 3: Confirm 'env' file exists and is a file ===
if (!fs.existsSync(envFilePath) || !fs.statSync(envFilePath).isFile()) {
  console.error("❌ 'env' file not found at:", envFilePath);
  process.exit(1);
}

// === STEP 4: Parse .env and validate ===
const env = dotenv.parse(fs.readFileSync(envFilePath));
const ETH_PRIVATE_KEY = env.ETH_PRIVATE_KEY;
if (!ETH_PRIVATE_KEY) {
  console.error("❌ ETH_PRIVATE_KEY not found in env.");
  process.exit(1);
}

// === STEP 5: Setup Web3 and address ===
const web3 = new Web3("");

const account = web3.eth.accounts.privateKeyToAccount(ETH_PRIVATE_KEY);
const address = web3.utils.toChecksumAddress(account.address);
const privateKey = Buffer.from(ETH_PRIVATE_KEY.replace(/^0x/, ""), "hex");

const customCommon = Common.forCustomChain("mainnet", {
  name: "ethereum",
  networkId: 11155111,
  chainId: 11155111,
}, "petersburg");
//modify chain id for respective chains above 

// === STEP 6: Sweep Logic ===
(async () => {
  try {
    const balanceWei = await web3.eth.getBalance(address);
    const balanceEth = parseFloat(web3.utils.fromWei(balanceWei, "ether"));

    if (balanceEth < 0.00004) {
      console.log(`[${address}] Balance too low to sweep (${balanceEth} ETH).`);
      return;
    }

    const gasPrice = parseInt(await web3.eth.getGasPrice()) + 14000000;
    const gasLimit = await web3.eth.estimateGas({ from: address, to: masterWallet });
    const gasCost = (gasPrice) * (gasLimit);
    const sendValue = parseFloat(balanceWei) - gasCost;

    if (sendValue <= 0) {
      console.log(`[${address}] Not enough balance after gas.`);
      return;
    }

    const nonce = await web3.eth.getTransactionCount(address, "pending");

    const tx = new Tx({
      to: masterWallet,
      value: web3.utils.toHex(sendValue),
      gasLimit: web3.utils.toHex(gasLimit),
      gasPrice: web3.utils.toHex(gasPrice),
      nonce: web3.utils.toHex(nonce)
    }, { common: customCommon });

    tx.sign(privateKey);
    const raw = "0x" + tx.serialize().toString("hex");

    web3.eth.sendSignedTransaction(raw)
      .on("transactionHash", (hash) => {
        console.log(`[${address}] ✅ Swept to ${masterWallet} | TxHash: ${hash}`);
      })
      .on("error", (err) => {
        console.error(`[${address}] ❌ Send error: ${err.message}`);
        process.exit(1);
      });

  } catch (err) {
    console.error(`[${address}] 💥 Exception: ${err.message}`);
    process.exit(1);
  }
})();
