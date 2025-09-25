const { InMemorySigner } = require('@taquito/signer');
const { TezosToolkit } = require('@taquito/taquito');

async function generateTezosWallet(mnemonic) {
  const signer = await InMemorySigner.fromMnemonic(mnemonic);
  const tezosToolkit = new TezosToolkit('https://mainnet.api.tez.ie');
  tezosToolkit.setProvider({ signer });

  const tezosAddress = await signer.publicKeyHash();
  const tezosPrivateKey = await signer.secretKey();

  return {
    address: tezosAddress,
    privateKey: tezosPrivateKey,
  };
}

module.exports = {
  generateTezosWallet,
};