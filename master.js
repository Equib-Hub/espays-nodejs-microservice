import 'dotenv/config';
import express from 'express';
import { ethers } from 'ethers';
import { z } from 'zod';

const app = express();
app.use(express.json({ limit: '50kb' }));

/** ===== Ethers setup ===== */
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

/** ===== Simple nonce queue ===== */ //not necessary, pending in nnonce fixes this
let noncePromise = Promise.resolve();
const withNonceLock = (fn) => {
  const next = noncePromise.then(fn, fn);
  noncePromise = next.catch(() => {}); // keep chain alive
  return next;
};

/** ===== Gas safety multiplier ===== */ // a fixed safety to enable transactions always get processed i.e if gas is 10 gwei new gwei + safety gwei + 12gwei, hence transaction priotized
const GAS_SAFETY_MULT = 1.2;

/** ===== ERC20 minimal ABI ===== */
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)"
];

/** ===== ETH withdrawal schema ===== */// validating eth address to ensure it matches the ethers format
const withdrawSchema = z.object({
  to: z.string().refine((v) => ethers.isAddress(v), 'Invalid destination address'),
  amount: z.string()
    .or(z.number())
    .transform((v) => v.toString())
    .refine((s) => Number(s) > 0, 'Amount must be > 0 (ETH)'),
  idemKey: z.string().max(128).optional(),
  maxFeeGwei: z.number().positive().optional(),
  maxPriorityGwei: z.number().positive().optional()
});

/** ===== Token withdrawal schema ===== */
const tokenSchema = z.object({
  token: z.string().refine((v) => ethers.isAddress(v), 'Invalid token address'),
  to: z.string().refine((v) => ethers.isAddress(v), 'Invalid destination address'),
  amount: z.string().or(z.number()).transform((v) => v.toString()),
  idemKey: z.string().max(128).optional(),
  maxFeeGwei: z.number().positive().optional(),
  maxPriorityGwei: z.number().positive().optional()
});

/** ===== ETH withdrawal endpoint ===== */
app.post('/withdraw', async (req, res) => {
  try {
    const parsed = withdrawSchema.parse(req.body);
    const to = ethers.getAddress(parsed.to);          // checksum
    const valueWei = ethers.parseEther(parsed.amount);

    // Fee data (EIP-1559)
    const fee = await provider.getFeeData();
    let maxFeePerGas = fee.maxFeePerGas ?? fee.gasPrice ?? ethers.parseUnits('30', 'gwei');
    let maxPriorityFeePerGas = fee.maxPriorityFeePerGas ?? ethers.parseUnits('1.5', 'gwei');

    // Apply caps
    const cap = (n, gweiCap) => (gweiCap ? ethers.parseUnits(String(gweiCap), 'gwei') : n);
    maxFeePerGas = cap(maxFeePerGas, parsed.maxFeeGwei ?? Number(process.env.MAX_FEE_PER_GAS));
    maxPriorityFeePerGas = cap(maxPriorityFeePerGas, parsed.maxPriorityGwei ?? Number(process.env.MAX_PRIORITY_FEE_PER_GAS));
    if (maxPriorityFeePerGas > maxFeePerGas) maxPriorityFeePerGas = maxFeePerGas;

    const txDraft = { to, value: valueWei, maxFeePerGas, maxPriorityFeePerGas, type: 2 };
    let gasLimit = await provider.estimateGas({ ...txDraft, from: wallet.address });
    gasLimit = ethers.toBigInt(Math.ceil(Number(gasLimit) * GAS_SAFETY_MULT));

    const balance = await provider.getBalance(wallet.address, 'latest');
    const maxGasCost = gasLimit * maxFeePerGas;
    if (balance < valueWei + maxGasCost) {
      return res.status(400).json({
        ok: false,
        error: 'INSUFFICIENT_FUNDS',
        details: {
          balanceEth: ethers.formatEther(balance),
          requiredEth: ethers.formatEther(valueWei + maxGasCost)
        }
      });
    }

    const sendResult = await withNonceLock(async () => {
      const nonce = await provider.getTransactionCount(wallet.address, 'pending');
      return wallet.sendTransaction({ ...txDraft, gasLimit, nonce });
    });

    return res.json({
      ok: true,
      txHash: sendResult.hash,
      to,
      amountEth: ethers.formatEther(valueWei),
      from: wallet.address,
      network: await provider.getNetwork().then(n => n.name || `chainId:${n.chainId}`)
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'INVALID_INPUT', details: err.flatten() });
    }
    return res.status(500).json({ ok: false, error: 'SEND_FAILED', details: String(err?.message || err) });
  }
});

/** ===== Token withdrawal endpoint ===== */
app.post('/withdraw-token', async (req, res) => {
  try {
    const parsed = tokenSchema.parse(req.body);
    const tokenAddr = ethers.getAddress(parsed.token);
    const to = ethers.getAddress(parsed.to);

    const contract = new ethers.Contract(tokenAddr, ERC20_ABI, wallet);
    const decimals = await contract.decimals();
    const amount = ethers.parseUnits(parsed.amount, decimals);

    const fee = await provider.getFeeData();
    let maxFeePerGas = fee.maxFeePerGas ?? ethers.parseUnits('30', 'gwei');
    let maxPriorityFeePerGas = fee.maxPriorityFeePerGas ?? ethers.parseUnits('1.5', 'gwei');

    const cap = (n, gweiCap) => (gweiCap ? ethers.parseUnits(String(gweiCap), 'gwei') : n);
    maxFeePerGas = cap(maxFeePerGas, parsed.maxFeeGwei ?? Number(process.env.MAX_FEE_PER_GAS));
    maxPriorityFeePerGas = cap(maxPriorityFeePerGas, parsed.maxPriorityGwei ?? Number(process.env.MAX_PRIORITY_FEE_PER_GAS));
    if (maxPriorityFeePerGas > maxFeePerGas) maxPriorityFeePerGas = maxFeePerGas;

    const txDraft = await contract.transfer.populateTransaction(to, amount);
    txDraft.maxFeePerGas = maxFeePerGas;
    txDraft.maxPriorityFeePerGas = maxPriorityFeePerGas;

    let gasLimit = await provider.estimateGas({ ...txDraft, from: wallet.address });
    gasLimit = ethers.toBigInt(Math.ceil(Number(gasLimit) * GAS_SAFETY_MULT));
    txDraft.gasLimit = gasLimit;

    const balance = await contract.balanceOf(wallet.address);
    if (balance < amount) {
      return res.status(400).json({
        ok: false,
        error: 'INSUFFICIENT_TOKEN_BALANCE',
        details: {
          balance: ethers.formatUnits(balance, decimals),
          required: ethers.formatUnits(amount, decimals)
        }
      });
    }

    const sendResult = await withNonceLock(async () => {
      const nonce = await provider.getTransactionCount(wallet.address, 'pending');
      return wallet.sendTransaction({ ...txDraft, nonce });
    });

    return res.json({
      ok: true,
      txHash: sendResult.hash,
      token: tokenAddr,
      to,
      amount: parsed.amount,
      decimals,
      from: wallet.address
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'INVALID_INPUT', details: err.flatten() });
    }
    return res.status(500).json({ ok: false, error: 'SEND_FAILED', details: String(err?.message || err) });
  }
});

/** ===== Health check ===== */
app.get('/health', async (_req, res) => {
  try {
    const [block, addr] = await Promise.all([provider.getBlockNumber(), wallet.getAddress()]);
    res.json({ ok: true, block, address: addr });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Withdrawal service running on :${PORT}`));
