const request = require('supertest');
const app = require('../../src/app'); // Adjust the path as necessary
const walletGenerator = require('../../src/services/walletGenerator');

jest.mock('../../src/services/walletGenerator');

describe('Wallet Generator Service', () => {
  it('should generate a wallet and return wallet information', async () => {
    const mockWalletData = {
      ethereum: { address: '0x1234567890abcdef1234567890abcdef12345678' },
      bitcoin: { address: 'bc1q1234567890abcdef1234567890abcdef123456' },
      solana: { address: 'So11111111111111111111111111111111111111112' },
      ton: { address: 'EQD1234567890abcdef1234567890abcdef123456' },
      tezos: { address: 'tz1abcdef1234567890abcdef1234567890abcdef' },
      cosmos: { address: 'cosmos1abcdef1234567890abcdef1234567890abcdef' },
      polkadot: { address: '1abcdef1234567890abcdef1234567890abcdef' },
      algorand: { address: 'ALGO1234567890abcdef1234567890abcdef123456' },
      stellar: { address: 'G1234567890abcdef1234567890abcdef123456' },
    };

    walletGenerator.generateWallets.mockResolvedValue(mockWalletData);

    const response = await request(app)
      .post('/create-wallet')
      .send({ mnemonic: 'test mnemonic phrase' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Wallet created successfully',
      ...mockWalletData,
    });
  });

  it('should return an error if wallet generation fails', async () => {
    walletGenerator.generateWallets.mockRejectedValue(new Error('Wallet generation failed'));

    const response = await request(app)
      .post('/create-wallet')
      .send({ mnemonic: 'test mnemonic phrase' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Wallet creation failed' });
  });
});