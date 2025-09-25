const { ethers } = require('ethers');

async function generateEthereumWallet(mnemonic) {
  const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic);
  const ethWallet = new ethers.Wallet(hdNode.privateKey);
  
  return {
    address: ethWallet.address,
    privateKey: ethWallet.privateKey,
  };
}

module.exports = {
  generateEthereumWallet,
};