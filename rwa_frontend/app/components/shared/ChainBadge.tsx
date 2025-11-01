/**
 * ChainBadge - 鏈徽章元件
 * 顯示鏈圖示與名稱
 */

'use client'

import { SUPPORTED_CHAINS } from '../../constants/chains'
import type { ChainId } from '../../types'

interface ChainBadgeProps {
  chainId: ChainId
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

export default function ChainBadge({ 
  chainId, 
  size = 'md', 
  showName = true,
  className = '' 
}: ChainBadgeProps) {
  const chain = SUPPORTED_CHAINS[chainId]
  
  if (!chain) {
    return null
  }
  
  const sizeClasses = {
    sm: 'text-xs py-1 px-2',
    md: 'text-sm py-1.5 px-3',
    lg: 'text-base py-2 px-4',
  }
  
  return (
    <span 
      className={`chip ${sizeClasses[size]} ${className}`}
      title={chain.name}
    >
      {showName ? chain.name : chain.symbol}
    </span>
  )
}

