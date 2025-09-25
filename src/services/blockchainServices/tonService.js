const { TonClient, WalletContractV4, internal } = require('@ton/ton');
const { mnemonicNew, mnemonicToPrivateKey } = require('@ton/crypto');

async function createTonWallet(mnemonic) {
  const mnemonicTon = await mnemonicNew();
  const keyPair = await mnemonicToPrivateKey(mnemonicTon);
  const workchain = 0; // Usually you need a workchain 0
  const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
  const client = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  });
  const contract = client.open(wallet);
  const tonPublicKey = keyPair.secretKey.toString('hex');
  const tonPrivateKey = keyPair.publicKey.toString('hex');
  const tonAddress = contract.address.toString();

  return {
    tonAddress,
    tonPublicKey,
    tonPrivateKey,
  };
}

module.exports = {
  createTonWallet,
};