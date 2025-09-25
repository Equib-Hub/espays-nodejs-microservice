const StellarHDWallet = require('stellar-hd-wallet');
const algosdk = require('algosdk');

async function generateStellarWallet() {
    const seed = StellarHDWallet.generateSeed();
    const stellarWallet = StellarHDWallet.default.fromSeed(seed);
    const stellarAddress = stellarWallet.getPublicKey(0);
    const stellarPrivateKey = stellarWallet.getSecret(0);

    return {
        address: stellarAddress,
        privateKey: stellarPrivateKey,
        mnemonic: StellarHDWallet.seedToMnemonic(seed),
    };
}

module.exports = {
    generateStellarWallet,
};