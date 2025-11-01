/**
 * 退款中心 - /m/refund
 * 處理逾期未達標的帳單退款
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

export default function RefundCenterPage() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'refunded'>('pending')
  
  useEffect(() => {
    loadBills()
  }, [])
  
  const loadBills = async () => {
    setIsLoading(true)
    try {
      const data = await getBills()
      // 只顯示需要退款的帳單（expired, refunding, refunded）
      const refundableBills = data.filter(b => 
        b.status === 'expired' || b.status === 'refunding' || b.status === 'refunded'
      )
      setBills(refundableBills)
    } catch (err) {
      console.error('載入失敗：', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 篩選帳單
  const filteredBills = bills.filter(bill => {
    if (filter === 'pending') return bill.status === 'expired' || bill.status === 'refunding'
    if (filter === 'refunded') return bill.status === 'refunded'
    return true
  })
  
  // 計算統計
  const stats = {
    pending: bills.filter(b => b.status === 'expired' || b.status === 'refunding').length,
    refunded: bills.filter(b => b.status === 'refunded').length,
    totalAmount: bills
      .filter(b => b.status === 'expired')
      .reduce((sum, b) => sum + parseFloat(b.assetRules[0]?.totalRequired || '0'), 0),
  }
  
  const handleRefund = (billId: string) => {
    // TODO: 實作實際的退款邏輯（需要對接合約）
    alert(`退款功能開發中...\n\n銷帳編號: ${billId}\n\n需要對接 Vault 合約的 refund 函數`)
  }
  
  // 狀態配置
  const getStatusConfig = (status: Bill['status']) => {
    const configs = {
      expired: { label: '待退款', color: 'var(--warning)', icon: '⚠️' },
      refunding: { label: '退款中', color: 'var(--info)', icon: '🔄' },
      refunded: { label: '已退款', color: 'var(--muted)', icon: '✅' },
    }
    return configs[status as 'expired' | 'refunding' | 'refunded']
  }
  
  return (
    <MerchantLayout>
      <div style={{ marginTop: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>
            退款中心
          </h1>
          <p className="muted">處理逾期未達標的帳單退款</p>
        </div>
        
        {/* 統計卡片 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="card" style={{ background: 'var(--warning-dim)', border: '1px solid var(--warning)' }}>
            <div className="sub" style={{ marginBottom: '6px', color: 'var(--warning)' }}>待處理</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--warning)' }}>
              {stats.pending}
            </div>
            <div className="sub" style={{ fontSize: '12px', color: 'var(--warning)' }}>
              {stats.totalAmount.toLocaleString()} USDT
            </div>
          </div>
          
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>已完成</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>
              {stats.refunded}
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
              className={`chip toggle ${filter === 'pending' ? 'sel' : ''}`}
              onClick={() => setFilter('pending')}
            >
              待處理 ({stats.pending})
            </button>
            <button
              className={`chip toggle ${filter === 'refunded' ? 'sel' : ''}`}
              onClick={() => setFilter('refunded')}
            >
              已退款 ({stats.refunded})
            </button>
          </div>
        </div>
        
        {/* 帳單列表 */}
        {isLoading ? (
          <LoadingState type="skeleton" />
        ) : filteredBills.length === 0 ? (
          <EmptyState
            icon="refund"
            title="沒有符合的帳單"
            description={filter === 'pending' ? '目前沒有需要退款的帳單' : '調整篩選條件試試'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredBills.map((bill) => {
              const statusConfig = getStatusConfig(bill.status)
              const needsRefund = bill.status === 'expired' || bill.status === 'refunding'
              const amount = parseFloat(bill.assetRules[0]?.totalRequired || '0')
              const expiredTime = new Date(bill.deadline * 1000).toLocaleString('zh-TW')
              
              return (
                <div 
                  key={bill.id}
                  className="card"
                  style={{ 
                    background: 'var(--panel)',
                    border: needsRefund ? '2px solid var(--warning)' : '1px solid var(--line)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, fontFamily: 'monospace' }}>
                          {bill.id}
                        </h3>
                        <span 
                          className="pill" 
                          style={{ 
                            background: `${statusConfig.color}22`,
                            borderColor: statusConfig.color,
                            color: statusConfig.color
                          }}
                        >
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </div>
                      
                      <p className="sub" style={{ marginBottom: '12px' }}>
                        {bill.description}
                      </p>
                      
                      <div className="row" style={{ gap: '12px', flexWrap: 'wrap' }}>
                        <span className="sub">
                          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          過期於 {expiredTime}
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
                      <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: statusConfig.color }}>
                        {amount.toLocaleString()}
                      </div>
                      <div className="sub" style={{ fontSize: '12px' }}>
                        {bill.assetRules[0]?.asset.symbol || 'USDT'}
                      </div>
                    </div>
                  </div>
                  
                  {/* 退款原因 */}
                  <div className="card" style={{ background: 'var(--warning-dim)', border: '1px solid var(--warning)', marginBottom: '12px', padding: '12px' }}>
                    <div className="sub" style={{ fontSize: '12px', color: 'var(--warning)' }}>
                      ⚠️ 退款原因：付款截止時間已過，但未達成付款條件
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
                    
                    {bill.status === 'expired' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRefund(bill.id)}
                        style={{ flex: 2 }}
                      >
                        ↩️ 執行退款
                      </button>
                    ) : bill.status === 'refunding' ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled
                        style={{ flex: 2 }}
                      >
                        🔄 退款中...
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled
                        style={{ flex: 2 }}
                      >
                        ✅ 已退款
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
                退款機制
              </div>
              <div className="sub" style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--info)' }}>
                • 當帳單超過截止時間且未達成付款條件時，需要退款給付款人<br />
                • 點擊「執行退款」會從各鏈 Vault 退還資金到付款人錢包<br />
                • 退款需要支付各鏈的 Gas Fee（由收款戶承擔）<br />
                • 建議盡快處理退款，避免影響收款戶信譽
              </div>
            </div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  )
}

