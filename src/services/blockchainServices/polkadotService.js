const { Keyring } = require('@polkadot/keyring');
const { mnemonicToMiniSecret, sr25519PairFromSeed } = require('@polkadot/util-crypto');

async function generatePolkadotWallet(mnemonic) {
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 0 });
  const polkadotSeed = mnemonicToMiniSecret(mnemonic);
  const { publicKey, secretKey } = sr25519PairFromSeed(polkadotSeed);
  const polkadotAddress = keyring.encodeAddress(publicKey);
  const polkadotPrivateKey = Buffer.from(secretKey).toString('hex');

  return {
    address: polkadotAddress,
    privateKey: polkadotPrivateKey,
  };
}

module.exports = {
  generatePolkadotWallet,
};