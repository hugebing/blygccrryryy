// src/merkle.ts
import { keccak256, concat, Hex, toHex, encodeAbiParameters, parseAbiParameters } from 'viem';

// src/merkle.ts
export type Item = {
  ercCode: 20 | 21 | 23 | 43;   // ← 用字面量聯集，別用 number
  token: `0x${string}`;
  id: bigint;
  amount: bigint;
};

export function sortItems(items: Item[]): Item[] {
  // 以 (ercCode, token, id) 升冪；避免 BigInt 回傳非 number，統一回傳 -1/0/1
  return [...items].sort((a, b) => {
    if (a.ercCode !== b.ercCode) return a.ercCode - b.ercCode;
    if (a.token !== b.token) return (BigInt(a.token) < BigInt(b.token) ? -1 : 1);
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  });
}

export function hashItemsStrict(items: Item[]): Hex {
  const s = sortItems(items);
  let acc = keccak256('0x');
  for (const it of s) {
    const leaf = keccak256(
      encodeAbiParameters(parseAbiParameters('uint8,address,uint256,uint256'),
        [it.ercCode, it.token, it.id, it.amount]
      )
    );
    acc = keccak256(concat([acc, leaf]));
  }
  return acc;
}

function hashPairSorted(a: Hex, b: Hex): Hex {
  return keccak256(BigInt(a) <= BigInt(b) ? concat([a,b]) : concat([b,a]));
}

// 與合約一致的 leaf
export function chainLeafHash(
  chainId: bigint,
  vault: `0x${string}`,
  billId: Hex,
  itemsHash: Hex
): Hex {
  const CHAIN_LEAF_TYPEHASH = keccak256(
    toHex(new TextEncoder().encode("ChainLeaf(uint256 chainId,address vault,bytes32 billId,bytes32 itemsHash)"))
  );
  return keccak256(encodeAbiParameters(
    parseAbiParameters('bytes32,uint256,address,bytes32,bytes32'),
    [CHAIN_LEAF_TYPEHASH, chainId, vault, billId, itemsHash]
  ));
}

// 簡易 Merkle（sorted pair）
export function buildRoot(leaves: Hex[]): { root: Hex, layers: Hex[][] } {
  if (leaves.length === 0) return { root: keccak256('0x'), layers: [] };
  let level = leaves;
  const layers: Hex[][] = [level];
  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i=0;i<level.length;i+=2) {
      next.push(i+1 < level.length ? hashPairSorted(level[i], level[i+1]) : hashPairSorted(level[i], level[i]));
    }
    level = next;
    layers.push(level);
  }
  return { root: level[0], layers };
}

export function getProof(leaves: Hex[], index: number): Hex[] {
  if (leaves.length <= 1) return [];
  const { layers } = buildRoot(leaves);
  const proof: Hex[] = [];
  let idx = index;
  for (let i=0;i<layers.length-1;i++) {
    const layer = layers[i];
    const pairIndex = idx ^ 1;
    const pair = layer[pairIndex] ?? layer[idx]; // 若無兄弟節點，重用自己
    proof.push(pair);
    idx = Math.floor(idx / 2);
  }
  return proof;
}
