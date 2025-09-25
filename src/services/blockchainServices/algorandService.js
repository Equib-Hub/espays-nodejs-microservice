const algosdk = require('algosdk');

async function generateAlgorandWallet() {
    const algorandAccount = algosdk.generateAccount();
    const algorandAddress = algorandAccount.addr.toString();
    const algorandPrivateKey = Buffer.from(algorandAccount.sk).toString('hex');
    const algorandMnemonic = algosdk.secretKeyToMnemonic(algorandAccount.sk);

    return {
        address: algorandAddress,
        privateKey: algorandPrivateKey,
        mnemonic: algorandMnemonic,
    };
}

module.exports = {
    generateAlgorandWallet,
};