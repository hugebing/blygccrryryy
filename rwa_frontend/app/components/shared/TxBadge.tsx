/**
 * TxBadge - 交易狀態徽章
 * 顯示交易狀態與區塊瀏覽器連結
 */

'use client'

import { getExplorerUrl } from '../../constants/chains'
import type { ChainId } from '../../types'

interface TxBadgeProps {
  txHash?: `0x${string}`
  chainId: ChainId
  status: 'pending' | 'success' | 'failed'
  showHash?: boolean
  className?: string
}

export default function TxBadge({ 
  txHash, 
  chainId, 
  status,
  showHash = true,
  className = '' 
}: TxBadgeProps) {
  const statusConfig = {
    pending: {
      color: 'var(--warning)',
      bgColor: 'var(--warning-dim)',
      label: '處理中',
    },
    success: {
      color: 'var(--success)',
      bgColor: 'var(--success-dim)',
      label: '成功',
    },
    failed: {
      color: 'var(--error)',
      bgColor: 'var(--error-dim)',
      label: '失敗',
    },
  }
  
  const config = statusConfig[status]
  const explorerUrl = txHash ? getExplorerUrl(chainId, txHash) : '#'
  
  return (
    <div 
      className={`pill ${className}`}
      style={{ 
        background: config.bgColor, 
        borderColor: config.color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      <span style={{ color: config.color, fontWeight: '600' }}>
        {config.label}
      </span>
      
      {showHash && txHash && (
        <>
          <span style={{ color: 'var(--muted)' }}>·</span>
          <a 
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              fontFamily: 'monospace', 
              fontSize: '11px',
              color: config.color,
              textDecoration: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {txHash.slice(0, 6)}...{txHash.slice(-4)}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              style={{ width: '12px', height: '12px', marginLeft: '4px', display: 'inline' }} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </>
      )}
    </div>
  )
}

