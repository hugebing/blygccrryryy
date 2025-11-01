/**
 * 領款中心 - /m/claim
 * 收款戶查看並領取已達標的款項
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import MerchantLayout from '../../components/layouts/MerchantLayout'
import LoadingState from '../../components/shared/LoadingState'
import EmptyState from '../../components/shared/EmptyState'
import ChainBadge from '../../components/shared/ChainBadge'
import { getBills } from '../../services/mockData'
import type { Bill } from '../../types'
import { shortenAddress } from '../../lib/utils'

export default function ClaimCenterPage() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'ready' | 'claimed'>('ready')
  
  useEffect(() => {
    loadBills()
  }, [])
  
  const loadBills = async () => {
    setIsLoading(true)
    try {
      const data = await getBills()
      // 只顯示已達標或已領款的帳單
      const claimableBills = data.filter(b => b.status === 'fulfilled' || b.status === 'claimed')
      setBills(claimableBills)
    } catch (err) {
      console.error('載入失敗：', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 篩選帳單
  const filteredBills = bills.filter(bill => {
    if (filter === 'ready') return bill.status === 'fulfilled'
    if (filter === 'claimed') return bill.status === 'claimed'
    return true
  })
  
  // 計算統計
  const stats = {
    ready: bills.filter(b => b.status === 'fulfilled').length,
    claimed: bills.filter(b => b.status === 'claimed').length,
    totalAmount: bills
      .filter(b => b.status === 'fulfilled')
      .reduce((sum, b) => sum + parseFloat(b.assetRules[0]?.totalRequired || '0'), 0),
  }
  
  const handleClaim = (billId: string) => {
    // TODO: 實作實際的領款邏輯（需要對接合約）
    alert(`領款功能開發中...\n\n銷帳編號: ${billId}\n\n需要對接 Vault 合約的 claim 函數`)
  }
  
  return (
    <MerchantLayout>
      <div style={{ marginTop: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>
            領款中心
          </h1>
          <p className="muted">查看並領取已達標的款項</p>
        </div>
        
        {/* 統計卡片 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="card" style={{ background: 'var(--success-dim)', border: '1px solid var(--success)' }}>
            <div className="sub" style={{ marginBottom: '6px', color: 'var(--success)' }}>可領款</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>
              {stats.ready}
            </div>
            <div className="sub" style={{ fontSize: '12px', color: 'var(--success)' }}>
              {stats.totalAmount.toLocaleString()} USDT
            </div>
          </div>
          
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>已領款</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>
              {stats.claimed}
            </div>
            <div className="sub" style={{ fontSize: '12px' }}>
              歷史記錄
            </div>
          </div>
        </div>
        
        {/* 篩選 */}
        <div className="card" style={{ marginBottom: '20px', overflow: 'visible' }}>
          <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`chip toggle ${filter === 'all' ? 'sel' : ''}`}
              onClick={() => setFilter('all')}
            >
              全部 ({bills.length})
            </button>
            <button
              className={`chip toggle ${filter === 'ready' ? 'sel' : ''}`}
              onClick={() => setFilter('ready')}
            >
              可領款 ({stats.ready})
            </button>
            <button
              className={`chip toggle ${filter === 'claimed' ? 'sel' : ''}`}
              onClick={() => setFilter('claimed')}
            >
              已領款 ({stats.claimed})
            </button>
          </div>
        </div>
        
        {/* 帳單列表 */}
        {isLoading ? (
          <LoadingState type="skeleton" />
        ) : filteredBills.length === 0 ? (
          <EmptyState
            icon="claim"
            title="沒有符合的帳單"
            description={filter === 'ready' ? '目前沒有可領款的帳單' : '調整篩選條件試試'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredBills.map((bill) => {
              const isReady = bill.status === 'fulfilled'
              const amount = parseFloat(bill.assetRules[0]?.totalRequired || '0')
              
              return (
                <div 
                  key={bill.id}
                  className="card"
                  style={{ 
                    background: 'var(--panel)',
                    border: isReady ? '2px solid var(--success)' : '1px solid var(--line)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, fontFamily: 'monospace' }}>
                          {bill.id}
                        </h3>
                        {isReady && (
                          <span className="pill" style={{ background: 'var(--success-dim)', color: 'var(--success)' }}>
                            ✅ 可領款
                          </span>
                        )}
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
                        
                        <div className="row" style={{ gap: '6px' }}>
                          {bill.assetRules[0]?.chainLimits.slice(0, 3).map((limit) => (
                            <ChainBadge key={limit.chainId} chainId={limit.chainId} size="sm" showName={false} />
                          ))}
                          {(bill.assetRules[0]?.chainLimits.length || 0) > 3 && (
                            <span className="chip" style={{ fontSize: '11px' }}>
                              +{(bill.assetRules[0]?.chainLimits.length || 0) - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: isReady ? 'var(--success)' : 'var(--muted)' }}>
                        {amount.toLocaleString()}
                      </div>
                      <div className="sub" style={{ fontSize: '12px' }}>
                        {bill.assetRules[0]?.asset.symbol || 'USDT'}
                      </div>
                    </div>
                  </div>
                  
                  {/* 操作按鈕 */}
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => router.push(`/m/bills/${bill.id}`)}
                      style={{ flex: 1 }}
                    >
                      查看詳情
                    </button>
                    
                    {isReady ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleClaim(bill.id)}
                        style={{ flex: 2 }}
                      >
                        💰 立即領款
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled
                        style={{ flex: 2 }}
                      >
                        ✅ 已領款
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* 說明 */}
        <div className="card" style={{ marginTop: '20px', background: 'var(--info-dim)', border: '1px solid var(--info)' }}>
          <div className="row" style={{ gap: '8px', alignItems: 'flex-start' }}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--info)' }}>
                領款流程
              </div>
              <div className="sub" style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--info)' }}>
                • 當帳單所有鏈都確認完成後，狀態變為「可領款」<br />
                • 點擊「立即領款」會從各鏈 Vault 提領到收款戶錢包<br />
                • 領款需要支付各鏈的 Gas Fee<br />
                • 建議累積到一定金額再批次領款以節省手續費
              </div>
            </div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  )
}
