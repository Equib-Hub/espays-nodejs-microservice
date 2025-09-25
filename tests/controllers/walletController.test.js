const request = require('supertest');
const express = require('express');
const walletController = require('../../src/controllers/walletController');

const app = express();
app.use(express.json());
app.post('/create-wallet', walletController.createWallet);

describe('Wallet Controller', () => {
  it('should create a wallet and return wallet information', async () => {
    const response = await request(app)
      .post('/create-wallet')
      .send({ mnemonic: 'test mnemonic phrase for wallet generation' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Wallet created successfully');
    expect(response.body).toHaveProperty('folder');
    expect(response.body).toHaveProperty('ethereum');
    expect(response.body.ethereum).toHaveProperty('address');
    expect(response.body).toHaveProperty('bitcoin');
    expect(response.body.bitcoin).toHaveProperty('address');
    expect(response.body).toHaveProperty('solana');
    expect(response.body.solana).toHaveProperty('address');
    expect(response.body).toHaveProperty('ton');
    expect(response.body.ton).toHaveProperty('address');
    expect(response.body).toHaveProperty('tezos');
    expect(response.body.tezos).toHaveProperty('address');
    expect(response.body).toHaveProperty('cosmos');
    expect(response.body.cosmos).toHaveProperty('address');
    expect(response.body).toHaveProperty('polkadot');
    expect(response.body.polkadot).toHaveProperty('address');
    expect(response.body).toHaveProperty('algorand');
    expect(response.body.algorand).toHaveProperty('address');
    expect(response.body).toHaveProperty('stellar');
    expect(response.body.stellar).toHaveProperty('address');
  });

  it('should return an error if wallet creation fails', async () => {
    const response = await request(app)
      .post('/create-wallet')
      .send({ mnemonic: '' }); // Invalid mnemonic

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Wallet creation failed');
  });
});