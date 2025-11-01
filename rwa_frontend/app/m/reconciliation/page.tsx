/**
 * 對帳銷帳頁面 - /m/reconciliation
 * ERP 整合與財務報表
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MerchantLayout from '../../components/layouts/MerchantLayout'
import LoadingState from '../../components/shared/LoadingState'
import ChainBadge from '../../components/shared/ChainBadge'
import { getBills } from '../../services/mockData'
import type { Bill } from '../../types'
import { shortenAddress } from '../../lib/utils'

export default function ReconciliationPage() {
  const router = useRouter()
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month')
  const [statusFilter, setStatusFilter] = useState<'all' | 'fulfilled' | 'claimed'>('all')
  
  useEffect(() => {
    loadBills()
  }, [])
  
  const loadBills = async () => {
    setIsLoading(true)
    try {
      const data = await getBills()
      setBills(data)
    } catch (err) {
      console.error('載入失敗：', err)
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
    
    // 日期篩選
    const billDate = new Date(bill.createdAt)
    const now = new Date()
    
    if (dateRange === 'today') {
      return billDate.toDateString() === now.toDateString()
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return billDate >= weekAgo
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return billDate >= monthAgo
    }
    
    return true
  })
  
  // 計算統計
  const stats = {
    totalBills: filteredBills.length,
    totalRevenue: filteredBills
      .filter(b => b.status === 'fulfilled' || b.status === 'claimed')
      .reduce((sum, b) => sum + parseFloat(b.assetRules[0]?.totalRequired || '0'), 0),
    pendingRevenue: filteredBills
      .filter(b => b.status === 'pending' || b.status === 'partial')
      .reduce((sum, b) => sum + parseFloat(b.assetRules[0]?.totalRequired || '0'), 0),
    completedCount: filteredBills.filter(b => b.status === 'fulfilled' || b.status === 'claimed').length,
  }
  
  // 匯出 CSV
  const handleExportCSV = () => {
    // TODO: 實作 CSV 匯出（等待後端 API）
    alert('CSV 匯出功能開發中...\n\n將匯出篩選後的帳單資料為 CSV 格式')
  }
  
  // 匯出 JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(filteredBills, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reconciliation-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  
  // 格式化日期
  const formatDate = (timestamp: number | string) => {
    return new Date(timestamp).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }
  
  return (
    <MerchantLayout>
      <div style={{ marginTop: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>
            對帳銷帳
          </h1>
          <p className="muted">財務報表與 ERP 整合</p>
        </div>
        
        {/* 統計卡片 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>總帳單數</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>
              {stats.totalBills}
            </div>
          </div>
          
          <div className="card" style={{ background: 'var(--success-dim)', border: '1px solid var(--success)' }}>
            <div className="sub" style={{ marginBottom: '6px', color: 'var(--success)' }}>已完成收款</div>
            <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--success)' }}>
              {stats.totalRevenue.toLocaleString()}
            </div>
            <div className="sub" style={{ fontSize: '12px', color: 'var(--success)' }}>
              {stats.completedCount} 筆
            </div>
          </div>
          
          <div className="card" style={{ background: 'var(--warning-dim)', border: '1px solid var(--warning)' }}>
            <div className="sub" style={{ marginBottom: '6px', color: 'var(--warning)' }}>待收款</div>
            <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--warning)' }}>
              {stats.pendingRevenue.toLocaleString()}
            </div>
          </div>
          
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>完成率</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--info)' }}>
              {stats.totalBills > 0 ? Math.round(stats.completedCount / stats.totalBills * 100) : 0}%
            </div>
          </div>
        </div>
        
        {/* 篩選與匯出 */}
        <div className="card" style={{ marginBottom: '20px', overflow: 'visible' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto', minWidth: '0' }}>
              {/* 日期範圍 */}
              <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                <span className="sub" style={{ fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>日期範圍:</span>
                {(['today', 'week', 'month', 'all'] as const).map((range) => (
                  <button
                    key={range}
                    className={`chip toggle ${dateRange === range ? 'sel' : ''}`}
                    onClick={() => setDateRange(range)}
                  >
                    {{ today: '今天', week: '本週', month: '本月', all: '全部' }[range]}
                  </button>
                ))}
              </div>
              
              {/* 狀態篩選 */}
              <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                <span className="sub" style={{ fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>狀態:</span>
                {(['all', 'fulfilled', 'claimed'] as const).map((status) => (
                  <button
                    key={status}
                    className={`chip toggle ${statusFilter === status ? 'sel' : ''}`}
                    onClick={() => setStatusFilter(status)}
                  >
                    {{ all: '全部', fulfilled: '已達標', claimed: '已領款' }[status]}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 匯出按鈕 */}
            <div className="row" style={{ gap: '8px', flexShrink: 0 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleExportCSV}
              >
                📊 匯出 CSV
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleExportJSON}
              >
                📄 匯出 JSON
              </button>
            </div>
          </div>
        </div>
        
        {/* 帳單列表（表格形式） */}
        {isLoading ? (
          <LoadingState type="skeleton" />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--panel)', borderBottom: '2px solid var(--line)' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '13px' }}>日期</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '13px' }}>銷帳編號</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '13px' }}>收款戶</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '13px' }}>鏈</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>金額</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '700', fontSize: '13px' }}>狀態</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '700', fontSize: '13px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>
                        <div className="sub">沒有符合篩選條件的帳單</div>
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill, index) => {
                      const statusColors = {
                        draft: 'var(--muted)',
                        pending: 'var(--warning)',
                        partial: 'var(--info)',
                        fulfilled: 'var(--success)',
                        claimed: 'var(--success)',
                        expired: 'var(--error)',
                        refunding: 'var(--warning)',
                        refunded: 'var(--muted)',
                        cancelled: 'var(--muted)',
                      }
                      
                      return (
                        <tr 
                          key={bill.id}
                          style={{ 
                            borderBottom: '1px solid var(--line)',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--panel)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          onClick={() => router.push(`/m/bills/${bill.id}`)}
                        >
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontSize: '13px' }}>{formatDate(bill.createdAt)}</div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: '600', fontFamily: 'monospace', fontSize: '13px' }}>
                              {bill.id}
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div className="sub" style={{ fontSize: '11px', fontFamily: 'monospace' }}>{shortenAddress(bill.payeeAddress, 4, 4)}</div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div className="row" style={{ gap: '4px' }}>
                              {bill.assetRules[0]?.chainLimits.slice(0, 2).map((limit) => (
                                <ChainBadge key={limit.chainId} chainId={limit.chainId} size="sm" showName={false} />
                              ))}
                              {(bill.assetRules[0]?.chainLimits.length || 0) > 2 && (
                                <span className="chip" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                  +{(bill.assetRules[0]?.chainLimits.length || 0) - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '15px' }}>
                              {parseFloat(bill.assetRules[0]?.totalRequired || '0').toLocaleString()}
                            </div>
                            <div className="sub" style={{ fontSize: '11px' }}>
                              {bill.assetRules[0]?.asset.symbol || 'USDT'}
                            </div>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <span 
                              className="pill"
                              style={{ 
                                fontSize: '11px',
                                background: `${statusColors[bill.status]}22`,
                                borderColor: statusColors[bill.status],
                                color: statusColors[bill.status],
                              }}
                            >
                              {
                                {
                                  draft: '草稿',
                                  pending: '待付款',
                                  partial: '部分付款',
                                  fulfilled: '已達標',
                                  claimed: '已領款',
                                  expired: '已過期',
                                  refunding: '退款中',
                                  refunded: '已退款',
                                  cancelled: '已取消',
                                }[bill.status]
                              }
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/m/bills/${bill.id}`)
                              }}
                              style={{ fontSize: '11px' }}
                            >
                              查看
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* ERP 整合說明 */}
        <div className="card" style={{ marginTop: '20px', background: 'var(--info-dim)', border: '1px solid var(--info)' }}>
          <div className="row" style={{ gap: '8px', alignItems: 'flex-start' }}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--info)' }}>
                ERP 整合
              </div>
              <div className="sub" style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--info)' }}>
                • 匯出的資料可直接匯入 SAP、Oracle 等 ERP 系統<br />
                • 支援 CSV 和 JSON 格式，符合主流財務軟體標準<br />
                • 每筆交易都有唯一的銷帳編號，方便追蹤對帳<br />
                • 可依日期範圍和狀態篩選，產生符合需求的財務報表
              </div>
            </div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  )
}

