const bip39 = require('bip39');
const { ethers } = require('ethers');
const ecc = require('noble-secp256k1');
const bip32 = require('bip32');
const bitcoin = require('bitcoinjs-lib');
const solanaWeb3 = require('@solana/web3.js');
const { TonClient, WalletContractV4, internal } = require('@ton/ton');
const { mnemonicNew, mnemonicToPrivateKey } = require('@ton/crypto');
const { Secp256k1HdWallet } = require('@cosmjs/amino');
const { Slip10RawIndex } = require('@cosmjs/crypto');
const { Keyring } = require('@polkadot/keyring');
const { InMemorySigner } = require('@taquito/signer');
const algosdk = require('algosdk');
const StellarHDWallet = require('stellar-hd-wallet');
const { mnemonicGenerate, mnemonicToMiniSecret, sr25519PairFromSeed } = require('@polkadot/util-crypto');

class WalletController {
  async createWallet(req, res) {
    try {
      const mnemonic = req.body?.mnemonic || bip39.generateMnemonic();
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const mnemonicTon = await mnemonicNew();

      // TON Wallet
      const keyPair = await mnemonicToPrivateKey(mnemonicTon);
      const workchain = 0;
      const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
      const client = new TonClient({
        endpoint: 'https://toncenter.com/api/v2/jsonRPC',
      });
      const contract = client.open(wallet);
      const tonPublicKey = keyPair.secretKey.toString('hex');
      const tonPrivateKey = keyPair.publicKey.toString('hex');
      const tonAddress = contract.address.toString();

      // Ethereum Wallet
      const hdNode = ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(mnemonic));
      const ethWallet = new ethers.Wallet(hdNode.privateKey);
      const ethPrivateKey = ethWallet.privateKey;
      const ethAddress = ethWallet.address;

      // Bitcoin Wallet
      const root = bip32.BIP32Factory(ecc).fromSeed(seed);
      const btcNode = root.derivePath("m/84'/0'/0'/0/0");
      const btcPrivateKey = btcNode.toWIF();
      const { address: btcAddress } = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(btcNode.publicKey),
        network: bitcoin.networks.bitcoin,
      });

      // Solana Wallet
      const solSeed = seed.slice(0, 32);
      const solKeypair = solanaWeb3.Keypair.fromSeed(solSeed);
      const solPrivateKey = Buffer.from(solKeypair.secretKey).toString('hex');
      const solAddress = solKeypair.publicKey.toBase58();

      // Cosmos Wallet
      const cosmosHdPath = [
        Slip10RawIndex.hardened(44),
        Slip10RawIndex.hardened(118),
        Slip10RawIndex.hardened(0),
        Slip10RawIndex.normal(0),
        Slip10RawIndex.normal(0),
      ];
      const cosmosWallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: 'cosmos',
        hdPaths: [cosmosHdPath],
      });
      const [{ address: cosmosAddress, privkey: cosmosPrivateKeyRaw }] = await cosmosWallet.getAccountsWithPrivkeys();
      const cosmosPrivateKey = Buffer.from(cosmosPrivateKeyRaw).toString('hex');

      // Polkadot Wallet
      const keyring = new Keyring({ type: 'sr25519', ss58Format: 0 });
      const polkadotSeed = mnemonicToMiniSecret(mnemonic);
      const { publicKey, secretKey } = sr25519PairFromSeed(polkadotSeed);
      const polkadotAddress = keyring.encodeAddress(publicKey);
      const polkadotPrivateKey = Buffer.from(secretKey).toString('hex');

      // Algorand Wallet
      const algorandAccount = algosdk.generateAccount();
      const algorandAddress = algorandAccount.addr.toString();
      const algorandPrivateKey = Buffer.from(algorandAccount.sk).toString('hex');
      const algorandMnemonic = algosdk.secretKeyToMnemonic(algorandAccount.sk);

      // Tezos Wallet
      const signer = await InMemorySigner.fromMnemonic({ mnemonic });
      const tezosAddress = await signer.publicKeyHash();
      const tezosPrivateKey = await signer.secretKey();

      // Stellar Wallet
      const stellarWallet = StellarHDWallet.default.fromSeed(seed);
      const stellarAddress = stellarWallet.getPublicKey(0);
      const stellarPrivateKey = stellarWallet.getSecret(0);

      // Respond with addresses only
      res.json({
        success: true,
        message: 'Wallet created successfully',
        wallets: {
          evm: { address: ethAddress, privateKey: ethPrivateKey, mnemonic: mnemonic },
          brc: { address: btcAddress, privateKey: btcPrivateKey, mnemonic: mnemonic },
          svm: { address: solAddress, privateKey: solPrivateKey, mnemonic: mnemonic },
          tvm: { address: tonAddress, publicKey: tonPublicKey, privateKey: tonPrivateKey, mnemonic: mnemonicTon },
          cosmos: { address: cosmosAddress, privateKey: cosmosPrivateKey, mnemonic: mnemonic },
          substrate: { address: polkadotAddress, privateKey: polkadotPrivateKey, mnemonic: mnemonic },
          algorand: { address: algorandAddress, privateKey: algorandPrivateKey, mnemonic: algorandMnemonic },
          tezos: { address: tezosAddress, privateKey: tezosPrivateKey, mnemonic: mnemonic },
          stellar: { address: stellarAddress, privateKey: stellarPrivateKey, mnemonic: mnemonic },
        },
      });

    } catch (err) {
      console.error('[Wallet Creation Error]', err.message);
      res.status(500).json({ error: 'Wallet creation failed' });
    }
  }
}

module.exports = new WalletController();