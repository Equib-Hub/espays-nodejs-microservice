const bip39 = require('bip39');
const ecc = require('noble-secp256k1');
const bip32 = require('bip32');
const bitcoin = require('bitcoinjs-lib');

async function generateBitcoinWallet(mnemonic) {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32.BIP32Factory(ecc).fromSeed(seed);
    const btcNode = root.derivePath("m/84'/0'/0'/0/0");
    const btcPrivateKey = btcNode.toWIF();
    const { address: btcAddress } = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(btcNode.publicKey),
        network: bitcoin.networks.bitcoin,
    });

    return {
        address: btcAddress,
        privateKey: btcPrivateKey,
    };
}

module.exports = {
    generateBitcoinWallet,
};