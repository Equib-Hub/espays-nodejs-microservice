const { Secp256k1HdWallet, Slip10RawIndex } = require('@cosmjs/amino');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const { TonClient, WalletContractV4 } = require('@ton/ton');
const bip39 = require('bip39');

async function createCosmosWallet(mnemonic) {
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

  return { address: cosmosAddress, privateKey: cosmosPrivateKey };
}

async function createTonWallet(mnemonic) {
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const workchain = 0;
  const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
  const client = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  });
  const contract = client.open(wallet);
  const tonPublicKey = keyPair.secretKey.toString('hex');
  const tonPrivateKey = keyPair.publicKey.toString('hex');
  const tonAddress = contract.address.toString();

  return { address: tonAddress, privateKey: tonPrivateKey, publicKey: tonPublicKey };
}

module.exports = {
  createCosmosWallet,
  createTonWallet,
};