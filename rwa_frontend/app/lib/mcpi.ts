/**
 * MCPI (Multi-Chain Payment Intent) 工具函數
 * 用於生成、簽名與驗證多鏈付款意圖
 */

import type { Bill, MCPI } from '../types'

/**
 * 生成 MCPI
 */
export function generateMCPI(params: {
  bill: Bill
  payerAddress: `0x${string}`
  chainAllocations: Array<{
    chainId: number
    amount: string
    assetSymbol: string
  }>
}): MCPI {
  const { bill, payerAddress, chainAllocations } = params
  
  // 生成 nonce（防重放）
  const nonce = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  
  // 構建鏈意圖
  const chainIntents = chainAllocations.map(allocation => {
    // 找到對應的資產規則
    const assetRule = bill.assetRules.find(
      rule => rule.asset.symbol === allocation.assetSymbol
    )
    
    if (!assetRule) {
      throw new Error(`Asset rule not found for ${allocation.assetSymbol}`)
    }
    
    // 找到對應的鏈限制
    const chainLimit = assetRule.chainLimits.find(
      limit => limit.chainId === allocation.chainId
    )
    
    if (!chainLimit) {
      throw new Error(`Chain limit not found for chain ${allocation.chainId}`)
    }
    
    return {
      chainId: allocation.chainId,
      asset: assetRule.asset,
      amount: allocation.amount,
      vaultAddress: chainLimit.vaultAddress,
    }
  })
  
  const mcpi: MCPI = {
    billId: bill.id,
    payerAddress,
    chainIntents,
    deadline: bill.deadline,
    nonce,
    createdAt: Date.now(),
  }
  
  return mcpi
}

/**
 * 生成 EIP-712 類型化資料（用於簽名）
 */
export function getMCPITypedData(mcpi: MCPI) {
  // EIP-712 Domain
  const domain = {
    name: '咔鏘 Multi-Chain Payment',
    version: '1',
    chainId: 1, // 主鏈（可以是任意支援的鏈）
    verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`, // 驗證合約地址
  }
  
  // EIP-712 Types
  const types = {
    MCPI: [
      { name: 'billId', type: 'string' },
      { name: 'payerAddress', type: 'address' },
      { name: 'chainIntents', type: 'ChainIntent[]' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'string' },
    ],
    ChainIntent: [
      { name: 'chainId', type: 'uint256' },
      { name: 'assetAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'vaultAddress', type: 'address' },
    ],
  }
  
  // Message（簡化版，實際的 amount 需要根據 decimals 轉換）
  const message = {
    billId: mcpi.billId,
    payerAddress: mcpi.payerAddress,
    chainIntents: mcpi.chainIntents.map(intent => ({
      chainId: BigInt(intent.chainId),
      assetAddress: intent.asset.address || '0x0000000000000000000000000000000000000000',
      amount: BigInt(parseFloat(intent.amount) * Math.pow(10, intent.asset.decimals)),
      vaultAddress: intent.vaultAddress,
    })),
    deadline: BigInt(mcpi.deadline),
    nonce: mcpi.nonce,
  }
  
  return { domain, types, message }
}

/**
 * 格式化 MCPI 為可讀文字（用於顯示）
 */
export function formatMCPIForDisplay(mcpi: MCPI): string {
  const lines = [
    `銷帳編號: ${mcpi.billId}`,
    `付款人: ${mcpi.payerAddress}`,
    `截止時間: ${new Date(mcpi.deadline * 1000).toLocaleString('zh-TW')}`,
    '',
    '付款意圖:',
  ]
  
  mcpi.chainIntents.forEach((intent, index) => {
    lines.push(`  ${index + 1}. Chain ${intent.chainId}`)
    lines.push(`     資產: ${intent.asset.symbol}`)
    lines.push(`     金額: ${intent.amount}`)
    lines.push(`     Vault: ${intent.vaultAddress}`)
  })
  
  return lines.join('\n')
}

/**
 * 驗證 MCPI 是否有效
 */
export function validateMCPI(mcpi: MCPI, bill: Bill): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // 檢查銷帳編號
  if (mcpi.billId !== bill.id) {
    errors.push('銷帳編號不符')
  }
  
  // 檢查截止時間
  if (mcpi.deadline !== bill.deadline) {
    errors.push('截止時間不符')
  }
  
  // 檢查是否已過期
  if (Date.now() / 1000 > mcpi.deadline) {
    errors.push('已超過截止時間')
  }
  
  // 檢查每個資產是否達標
  const assetTotals: Record<string, number> = {}
  
  mcpi.chainIntents.forEach(intent => {
    const key = intent.asset.symbol
    assetTotals[key] = (assetTotals[key] || 0) + parseFloat(intent.amount)
  })
  
  bill.assetRules.forEach(rule => {
    const total = assetTotals[rule.asset.symbol] || 0
    const required = parseFloat(rule.totalRequired)
    
    if (Math.abs(total - required) > 0.000001) { // 浮點數容差
      errors.push(`${rule.asset.symbol} 金額不符：需要 ${required}，實際 ${total}`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

