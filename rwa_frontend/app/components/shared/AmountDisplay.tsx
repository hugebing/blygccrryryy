/**
 * AmountDisplay - 金額顯示元件
 * 支援 ETH、代幣、NFT 的格式化顯示
 */

'use client'

import { formatUnits } from 'viem'
import type { Asset } from '../../types'

interface AmountDisplayProps {
  // 方式 1: 傳遞完整 asset 物件
  amount?: string | bigint
  asset?: Asset
  
  // 方式 2: 傳遞獨立參數（簡化版）
  value?: string | bigint
  decimals?: number
  symbol?: string
  
  // 共用選項
  showSymbol?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function AmountDisplay({ 
  amount, 
  asset,
  value,
  decimals,
  symbol,
  showSymbol = true,
  size = 'md',
  className = '' 
}: AmountDisplayProps) {
  // 統一處理參數：支援兩種調用方式
  const displayAmount = amount ?? value ?? '0'
  const displayDecimals = asset?.decimals ?? decimals ?? 18
  const displaySymbol = asset?.symbol ?? symbol ?? ''
  const assetType = asset?.type
  
  // NFT 特殊處理
  if (assetType === 'ERC721') {
    return (
      <span className={className} style={{ fontWeight: '600' }}>
        #{displayAmount.toString()}
      </span>
    )
  }
  
  // 格式化金額
  const formatAmount = () => {
    if (typeof displayAmount === 'bigint') {
      return formatUnits(displayAmount, displayDecimals)
    }
    return displayAmount.toString()
  }
  
  const formattedAmount = formatAmount()
  const numericAmount = parseFloat(formattedAmount)
  
  // 根據金額大小決定顯示精度
  const getDisplayAmount = () => {
    if (numericAmount === 0) return '0'
    if (numericAmount < 0.000001) return '< 0.000001'
    if (numericAmount < 0.01) return numericAmount.toFixed(6)
    if (numericAmount < 1) return numericAmount.toFixed(4)
    if (numericAmount < 1000) return numericAmount.toFixed(2)
    return numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  
  const sizeStyles = {
    sm: { fontSize: '14px' },
    md: { fontSize: '16px' },
    lg: { fontSize: '20px', fontWeight: '700' },
  }
  
  return (
    <span 
      className={className} 
      style={{ 
        fontFamily: 'monospace',
        ...sizeStyles[size]
      }}
    >
      {getDisplayAmount()}
      {showSymbol && displaySymbol && (
        <span style={{ marginLeft: '4px', fontFamily: 'inherit' }}>
          {displaySymbol}
        </span>
      )}
    </span>
  )
}

