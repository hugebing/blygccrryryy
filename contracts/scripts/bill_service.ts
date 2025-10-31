// src/api.ts
import 'dotenv/config';
import express from 'express';
import { runPayDualChain, type PayConfig } from '../src/pay_dualchain_demo';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

function lastTwoDigits(billId: string): number {
  const m = billId.match(/(\d{2})$/);
  if (!m) throw new Error('billId 最後兩碼不是數字，請確認格式，例如 ...-2012');
  return Number(m[1]);
}

function jsonSafe<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

/** 以 child_process 執行 hardhat 指令（串流 stdout/stderr、回傳彙整字串） */
function runHardhat(network: string, scriptAbsPath: string, timeoutMs = 10 * 60 * 1000, envExtra: NodeJS.ProcessEnv = {}) {
  return new Promise<{
    network: string;
    code: number | null;
    ok: boolean;
    stdout: string;
    stderr: string;
    cmd: string;
  }>((resolve) => {
    const args = ['hardhat', 'run', '--network', network, scriptAbsPath];
    const cmdShown = `npx ${args.join(' ')}`;

    const child = spawn('npx', args, {
      shell: true,
      env: { ...process.env, ...envExtra },   // ★ 允許注入額外環境變數（例如 BILL_ID）
      cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';

    const killer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(`[hh:${network}] ${s}`);
    });

    child.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(`[hh:${network}] ${s}`);
    });

    child.on('close', (code) => {
      clearTimeout(killer);
      resolve({ network, code, ok: code === 0, stdout, stderr, cmd: cmdShown });
    });
  });
}

/** （保留）依序執行 03_mint_to_kernel.ts —— 若你不再需要可刪除 */
// async function runMintScripts(perChainNetworks: string[]) { ... }

/** ★ 新增：依序執行 04_unlock.ts，BILL_ID = 這次的 billId */
async function runUnlockScripts(billId: string, perChainNetworks: string[]) {
  // ★ 你指定的順序：sepolia → baseSepolia → optimismSepolia
  const wantedOrder = ['sepolia', 'baseSepolia', 'optimismSepolia'];
  const set = new Set(perChainNetworks);
  const networks = wantedOrder.filter((n) => set.has(n));

  const scriptPath =
    process.env.UNLOCK_SCRIPT_PATH ||
    path.resolve(process.cwd(), 'scripts/04_unlock.ts'); // ★ 預設 04_unlock.ts
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`找不到腳本：${scriptPath}（可用環境變數 UNLOCK_SCRIPT_PATH 覆蓋）`);
  }

  const results = [];
  for (const net of networks) {
    // ★ 關鍵：把 BILL_ID 注入到子程序環境
    results.push(await runHardhat(net, scriptPath, 10 * 60 * 1000, { BILL_ID: billId }));
  }
  return results;
}

/**
 * POST /pay-dualchain
 * body: { billId: string }
 * 1) 跑 runPayDualChain
 * 2) 依序跑四個網路的 scripts/04_unlock.ts（BILL_ID=本次 billId）
 */
app.post('/pay-dualchain', async (req, res) => {
  try {
    const { billId } = req.body ?? {};
    if (typeof billId !== 'string' || billId.length < 2) {
      return res.status(400).json({ ok: false, error: 'billId 必須是字串，且至少 2 碼' });
    }

    const tailNum = lastTwoDigits(billId);
    const nft21Id = BigInt(tailNum);

    const requiredEnv: Record<string, string | undefined> = {
      PAYEE: process.env.PAYEE,
      VAULT_Sepolia: process.env.VAULT_Sepolia,
      USDT_Sepolia: process.env.USDT_Sepolia,
      VAULT_Arbitrum_Sepolia: process.env.VAULT_Arbitrum_Sepolia,
      USDT_Arbitrum_Sepolia: process.env.USDT_Arbitrum_Sepolia,
      VAULT_OP_Sepolia: process.env.VAULT_OP_Sepolia,
      USDT_Base_Sepolia: process.env.USDT_Base_Sepolia,
      NFT15_OP_Sepolia: process.env.NFT15_OP_Sepolia,
      VAULT_Base_Sepolia: process.env.VAULT_Base_Sepolia,
      NFT21_Base_Sepolia: process.env.NFT21_Base_Sepolia,
    };

    const missing = Object.entries(requiredEnv).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      return res.status(500).json({ ok: false, error: `缺少環境變數: ${missing.join(', ')}` });
    }

    const cfg: PayConfig = {
      billId,
      payee: process.env.PAYEE as `0x${string}`,
      perChain: [
        {
          chain: 'sepolia',
          vault: process.env.VAULT_Sepolia as `0x${string}`,
          items: [{ ercCode: 20, token: process.env.USDT_Sepolia as `0x${string}`, id: 0n, amount: 100n * 10n ** 6n }],
        },
        {
          chain: 'optimismSepolia',
          vault: process.env.VAULT_OP_Sepolia as `0x${string}`,
          items: [
            { ercCode: 20, token: process.env.USDT_Base_Sepolia as `0x${string}`, id: 0n, amount: 300n * 10n ** 6n },
            { ercCode: 23, token: process.env.NFT15_OP_Sepolia as `0x${string}`, id: 12n, amount: 100n },
          ],
        },
        {
          chain: 'baseSepolia',
          vault: process.env.VAULT_Base_Sepolia as `0x${string}`,
          items: [
            { ercCode: 20, token: process.env.USDT_Base_Sepolia as `0x${string}`, id: 0n, amount: 300n * 10n ** 6n },
            { ercCode: 21, token: process.env.NFT21_Base_Sepolia as `0x${string}`, id: nft21Id, amount: 1n },
          ],
        },
      ],
    };

    // 1) 付款流程
    const payResult = await runPayDualChain(cfg);

    // 2) ★ 改為執行 04_unlock.ts（BILL_ID=本次 billId）
    const perChainNetworks = cfg.perChain.map((c) => c.chain);
    const unlockResults = await runUnlockScripts(billId, perChainNetworks);

    return res.status(200).json({
      ok: true,
      result: jsonSafe(payResult),
      unlockRuns: unlockResults.map((r) => ({
        network: r.network,
        ok: r.ok,
        code: r.code,
        cmd: r.cmd,
        stdout: r.stdout.length > 4000 ? (r.stdout.slice(0, 2000) + '\n...[truncated]...\n' + r.stdout.slice(-2000)) : r.stdout,
        stderr: r.stderr.length > 4000 ? (r.stderr.slice(0, 2000) + '\n...[truncated]...\n' + r.stderr.slice(-2000)) : r.stderr,
      })),
    });
  } catch (err: any) {
    console.error('[pay-dualchain] error:', err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT || 80);
app.listen(PORT, () => {
  console.log(`Pay DualChain API listening on http://localhost:${PORT}`);
});
