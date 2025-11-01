/**
 * 帳單列表頁 - /m/bills
 * 顯示所有帳單，支援搜尋與篩選
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MerchantLayout from '../../components/layouts/MerchantLayout'
import LoadingState from '../../components/shared/LoadingState'
import EmptyState from '../../components/shared/EmptyState'
import ChainBadge from '../../components/shared/ChainBadge'
import { getBills } from '../../services/mockData'
import type { Bill, BillStatus } from '../../types'
import { shortenAddress } from '../../lib/utils'

export default function BillsPage() {
  const router = useRouter()
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'all'>('all')
  
  // 載入帳單
  useEffect(() => {
    loadBills()
  }, [])
  
  const loadBills = async () => {
    setIsLoading(true)
    try {
      const data = await getBills()
      setBills(data)
    } catch (error) {
      console.error('載入帳單失敗：', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 篩選帳單
  const filteredBills = bills.filter(bill => {
    // 狀態篩選
    if (statusFilter !== 'all' && bill.status !== statusFilter) {
      return false
    }
    
    // 搜尋篩選
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        bill.id.toLowerCase().includes(term) ||
        bill.description.toLowerCase().includes(term) ||
        bill.payeeAddress.toLowerCase().includes(term)
      )
    }
    
    return true
  })
  
  // 狀態顯示配置
  const getStatusConfig = (status: BillStatus | string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      draft: { label: '草稿', color: 'var(--muted)', bg: '#1a1f26' },
      pending: { label: '待付款', color: 'var(--warning)', bg: 'var(--warning-dim)' },
      partial: { label: '部分付款', color: 'var(--info)', bg: 'var(--info-dim)' },
      fulfilled: { label: '已達標', color: 'var(--success)', bg: 'var(--success-dim)' },
      claimed: { label: '已領款', color: 'var(--success)', bg: 'var(--success-dim)' },
      expired: { label: '已過期', color: 'var(--error)', bg: 'var(--error-dim)' },
      refunding: { label: '退款中', color: 'var(--warning)', bg: 'var(--warning-dim)' },
      refunded: { label: '已退款', color: 'var(--muted)', bg: '#1a1f26' },
      cancelled: { label: '已取消', color: 'var(--muted)', bg: '#1a1f26' },
      // 向後兼容：處理舊的 'completed' 狀態
      completed: { label: '已完成', color: 'var(--success)', bg: 'var(--success-dim)' },
    }
    
    // 如果找不到對應配置，返回默認配置
    return configs[status] || { label: status, color: 'var(--muted)', bg: '#1a1f26' }
  }
  
  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  // 計算剩餘時間
  const getTimeRemaining = (deadline: number) => {
    const now = Math.floor(Date.now() / 1000)
    const remaining = deadline - now
    
    if (remaining <= 0) return '已截止'
    
    const hours = Math.floor(remaining / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `剩 ${days} 天`
    }
    
    return `剩 ${hours}h ${minutes}m`
  }
  
  return (
    <MerchantLayout>
      <div>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>
              帳單管理
            </h1>
            <p className="muted">建立與管理多鏈付款意圖</p>
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={() => router.push('/m/bills/new')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            建立帳單
          </button>
        </div>
        
        {/* 搜尋與篩選 */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {/* 搜尋框 */}
            <input
              type="text"
              placeholder="搜尋帳單編號、描述、收款戶..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: '1 1 300px' }}
            />
            
            {/* 狀態篩選 */}
            <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
              {(['all', 'pending', 'partial', 'fulfilled', 'expired'] as const).map((status) => (
                <button
                  key={status}
                  className={`chip toggle ${statusFilter === status ? 'sel' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? '全部' : getStatusConfig(status as BillStatus).label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* 帳單列表 */}
        {isLoading ? (
          <LoadingState type="skeleton" />
        ) : filteredBills.length === 0 ? (
          <EmptyState
            icon="bill"
            title={searchTerm || statusFilter !== 'all' ? '找不到符合的帳單' : '尚無帳單'}
            description={searchTerm || statusFilter !== 'all' ? '請調整搜尋條件' : '點擊上方按鈕建立第一張帳單'}
            action={
              !searchTerm && statusFilter === 'all'
                ? {
                    label: '建立帳單',
                    onClick: () => router.push('/m/bills/new'),
                  }
                : undefined
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredBills.map((bill) => {
              const statusConfig = getStatusConfig(bill.status)
              const totalChains = bill.assetRules.reduce((sum, rule) => {
                return sum + rule.chainLimits.length
              }, 0)
              
              return (
                <div
                  key={bill.id}
                  className="card"
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => router.push(`/m/bills/${bill.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gold)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line)'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    {/* 左側 - 主要資訊 */}
                    <div style={{ flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, fontFamily: 'monospace' }}>
                          {bill.id}
                        </h3>
                        <span 
                          className="pill"
                          style={{ 
                            background: statusConfig.bg,
                            borderColor: statusConfig.color,
                            color: statusConfig.color,
                            fontWeight: '600'
                          }}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      
                      <p className="sub" style={{ marginBottom: '12px' }}>
                        {bill.description}
                      </p>
                      
                      <div className="row" style={{ gap: '12px', flexWrap: 'wrap' }}>
                        <span className="sub">
                          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{shortenAddress(bill.payeeAddress, 8, 6)}</span>
                        </span>
                        <span className="sub">
                          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {getTimeRemaining(bill.deadline)}
                        </span>
                        <span className="sub">
                          {totalChains} 條鏈
                        </span>
                      </div>
                    </div>
                    
                    {/* 右側 - 金額與鏈 */}
                    <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', fontFamily: 'monospace' }}>
                        {bill.assetRules[0]?.totalRequired || '0'} {bill.assetRules[0]?.asset.symbol || ''}
                      </div>
                      
                      <div className="row" style={{ gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {bill.assetRules[0]?.chainLimits.slice(0, 3).map((limit) => (
                          <ChainBadge key={limit.chainId} chainId={limit.chainId} size="sm" showName={true} />
                        ))}
                        {totalChains > 3 && (
                          <span className="chip" style={{ fontSize: '11px' }}>
                            +{totalChains - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 底部 - 時間戳 */}
                  <div style={{ 
                    marginTop: '12px', 
                    paddingTop: '12px', 
                    borderTop: '1px solid var(--line)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span className="sub" style={{ fontSize: '11px' }}>
                      建立於 {formatDate(bill.createdAt)}
                    </span>
                    <span className="sub" style={{ fontSize: '11px' }}>
                      ID: {bill.id}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MerchantLayout>
  )
}

