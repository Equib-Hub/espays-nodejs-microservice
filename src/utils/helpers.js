const bip39 = require('bip39');
const ecc = require('noble-secp256k1');
const bip32 = require('bip32');
const bitcoin = require('bitcoinjs-lib');
const solanaWeb3 = require('@solana/web3.js');
const { TonClient, WalletContractV4, internal } = require('@ton/ton');
const { mnemonicNew, mnemonicToPrivateKey } = require('@ton/crypto');
const { Secp256k1HdWallet, Slip10RawIndex } = require('@cosmjs/amino');
const { Keyring } = require('@polkadot/keyring');
const { InMemorySigner } = require('@taquito/signer');
const algosdk = require('algosdk');
const StellarHDWallet = require('stellar-hd-wallet');

const generateWallets = async (mnemonic) => {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const wallets = {};

  // Bitcoin Wallet
  const root = bip32.BIP32Factory(ecc).fromSeed(seed);
  const btcNode = root.derivePath("m/84'/0'/0'/0/0");
  wallets.bitcoin = {
    privateKey: btcNode.toWIF(),
    address: bitcoin.payments.p2wpkh({ pubkey: Buffer.from(btcNode.publicKey), network: bitcoin.networks.bitcoin }).address,
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
    privateKey: Buffer.from(solKeypair.secretKey).toString('hex'),
    address: solKeypair.publicKey.toBase58(),
  };

  // TON Wallet
  const keyPair = await mnemonicToPrivateKey(await mnemonicNew());
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const client = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });
  wallets.ton = {
    privateKey: keyPair.secretKey.toString('hex'),
    publicKey: keyPair.publicKey.toString('hex'),
    address: (await client.open(wallet)).address.toString(),
  };

  // Cosmos Wallet
  const cosmosWallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, { prefix: 'cosmos', hdPaths: [[Slip10RawIndex.hardened(44), Slip10RawIndex.hardened(118), Slip10RawIndex.hardened(0), Slip10RawIndex.normal(0), Slip10RawIndex.normal(0)]] });
  const [{ address: cosmosAddress, privkey: cosmosPrivateKeyRaw }] = await cosmosWallet.getAccountsWithPrivkeys();
  wallets.cosmos = {
    privateKey: Buffer.from(cosmosPrivateKeyRaw).toString('hex'),
    address: cosmosAddress,
  };

  // Polkadot Wallet
  const keyring = new Keyring({ type: 'sr25519' });
  const polkadotSeed = mnemonicToMiniSecret(mnemonic);
  const { publicKey, secretKey } = sr25519PairFromSeed(polkadotSeed);
  wallets.polkadot = {
    privateKey: Buffer.from(secretKey).toString('hex'),
    address: keyring.encodeAddress(publicKey),
  };

  // Algorand Wallet
  const algorandAccount = algosdk.generateAccount();
  wallets.algorand = {
    privateKey: Buffer.from(algorandAccount.sk).toString('hex'),
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

module.exports = {
  generateWallets,
};