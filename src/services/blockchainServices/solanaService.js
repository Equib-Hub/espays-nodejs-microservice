const { Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');

async function generateSolanaWallet(mnemonic) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const solSeed = seed.slice(0, 32);
  const keypair = Keypair.fromSeed(solSeed);
  
  return {
    privateKey: Buffer.from(keypair.secretKey).toString('hex'),
    publicKey: keypair.publicKey.toBase58(),
  };
}

module.exports = {
  generateSolanaWallet,
};