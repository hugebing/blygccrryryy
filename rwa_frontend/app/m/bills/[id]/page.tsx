/**
 * 商戶帳單詳情頁 - /m/bills/:id
 * 查看帳單詳細資訊、付款進度、QR Code
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MerchantLayout from '../../../components/layouts/MerchantLayout'
import LoadingState from '../../../components/shared/LoadingState'
import EmptyState from '../../../components/shared/EmptyState'
import ChainBadge from '../../../components/shared/ChainBadge'
import AmountDisplay from '../../../components/shared/AmountDisplay'
import QRCard from '../../../components/merchant/QRCard'
import { getBillById } from '../../../services/mockData'
import type { Bill, Payment } from '../../../types'
import { shortenAddress } from '../../../lib/utils'

// 根據 chainId 獲取對應的區塊鏈瀏覽器 URL
const getExplorerUrl = (chainId: number, txHash: string): string => {
  const explorers: Record<number, string> = {
    11155111: 'https://sepolia.etherscan.io',       // Sepolia
    84532: 'https://sepolia.basescan.org',          // Base Sepolia
    11155420: 'https://sepolia-optimism.etherscan.io', // OP Sepolia
  }
  const baseUrl = explorers[chainId] || 'https://etherscan.io'
  return `${baseUrl}/tx/${txHash}`
}

export default function BillDetailPage() {
  const params = useParams()
  const router = useRouter()
  const billId = params.id as string
  
  const [bill, setBill] = useState<Bill | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'qr'>('overview')
  
  // 載入帳單資料
  useEffect(() => {
    loadData()
  }, [billId])
  
  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const billData = await getBillById(billId)
      if (!billData) {
        setError('找不到此帳單')
        return
      }
      
      setBill(billData)
      
      // 從新的 API 端點載入付款記錄
      try {
        const response = await fetch(`/api/payments/bill/${billId}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setPayments(result.data)
        } else {
          console.error('獲取付款記錄失敗:', result.error)
          setPayments([])
        }
      } catch (paymentErr) {
        console.error('載入付款記錄失敗:', paymentErr)
        setPayments([])
      }
    } catch (err) {
      console.error('載入帳單失敗：', err)
      setError('載入失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }
  
  // 狀態顯示配置
  const getStatusConfig = (status: Bill['status']) => {
    const configs = {
      draft: { label: '草稿', color: 'var(--muted)', bg: '#1a1f26', icon: '📝' },
      pending: { label: '待付款', color: 'var(--warning)', bg: 'var(--warning-dim)', icon: '⏳' },
      partial: { label: '部分付款', color: 'var(--info)', bg: 'var(--info-dim)', icon: '🔵' },
      fulfilled: { label: '已達標', color: 'var(--success)', bg: 'var(--success-dim)', icon: '✅' },
      claimed: { label: '已領款', color: 'var(--success)', bg: 'var(--success-dim)', icon: '💰' },
      expired: { label: '已過期', color: 'var(--error)', bg: 'var(--error-dim)', icon: '❌' },
      refunding: { label: '退款中', color: 'var(--warning)', bg: 'var(--warning-dim)', icon: '↩️' },
      refunded: { label: '已退款', color: 'var(--muted)', bg: '#1a1f26', icon: '💸' },
      cancelled: { label: '已取消', color: 'var(--muted)', bg: '#1a1f26', icon: '🚫' },
    }
    return configs[status]
  }
  
  // 格式化日期
  const formatDate = (timestamp: number | string) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
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
    
    if (remaining <= 0) return { text: '已截止', color: 'var(--error)' }
    
    const hours = Math.floor(remaining / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    
    let color = 'var(--success)'
    if (remaining < 300) color = 'var(--error)' // < 5 分鐘
    else if (remaining < 900) color = 'var(--warning)' // < 15 分鐘
    else if (remaining < 3600) color = 'var(--info)' // < 1 小時
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return { text: `剩餘 ${days} 天 ${hours % 24} 小時`, color }
    }
    
    return { text: `剩餘 ${hours} 小時 ${minutes} 分鐘`, color }
  }
  
  if (isLoading) {
    return (
      <MerchantLayout>
        <LoadingState message="載入帳單資訊..." />
      </MerchantLayout>
    )
  }
  
  if (error || !bill) {
    return (
      <MerchantLayout>
        <EmptyState
          icon="bill"
          title={error || '找不到帳單'}
          description="請確認銷帳編號是否正確"
          action={{
            label: '返回帳單列表',
            onClick: () => router.push('/m/bills'),
          }}
        />
      </MerchantLayout>
    )
  }
  
  const statusConfig = getStatusConfig(bill.status)
  const timeRemaining = getTimeRemaining(bill.deadline)
  
  // 計算總收款金額
  const totalPaid = payments.reduce((sum, payment) => {
    return sum + parseFloat(payment.amount)
  }, 0)
  
  return (
    <MerchantLayout>
      <div>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => router.push('/m/bills')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>
              {bill.id}
            </h1>
            <span 
              className="pill"
              style={{ 
                background: statusConfig.bg,
                borderColor: statusConfig.color,
                color: statusConfig.color,
                fontWeight: '700',
                fontSize: '14px'
              }}
            >
              {statusConfig.icon} {statusConfig.label}
            </span>
          </div>
          <p className="muted">{bill.description}</p>
        </div>
        
        {/* 關鍵指標卡片 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>收款戶</div>
            <div style={{ fontSize: '14px', fontWeight: '600', fontFamily: 'monospace' }}>{shortenAddress(bill.payeeAddress)}</div>
          </div>
          
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>截止時間</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: timeRemaining.color }}>
              {timeRemaining.text}
            </div>
          </div>
          
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>應收金額</div>
            {bill.assetRules.length === 1 ? (
              <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'monospace' }}>
                {bill.assetRules[0]?.totalRequired || '0'} {bill.assetRules[0]?.asset.symbol || ''}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700' }}>
                  {bill.assetRules.length} 筆資產
                </div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>
                  {bill.assetRules.map((rule, idx) => (
                    <div key={idx}>
                      {rule.totalRequired} {rule.asset.symbol}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>已收金額</div>
            {bill.assetRules.length === 1 ? (
              <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--success)' }}>
                {totalPaid.toFixed(2)} {bill.assetRules[0]?.asset.symbol || ''}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--success)' }}>
                  {bill.assetRules.length} 筆資產
                </div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>
                  {bill.assetRules.map((rule, idx) => {
                    const assetPayments = payments.filter(p => p.assetSymbol === rule.asset.symbol)
                    const totalReceived = assetPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
                    const isNFT = rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155'
                    return (
                      <div key={idx} style={{ color: 'var(--success)' }}>
                        {isNFT ? `×${Math.floor(totalReceived)}` : totalReceived.toFixed(2)} {rule.asset.symbol}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="card" style={{ marginBottom: '0', borderBottom: 'none', paddingBottom: '0' }}>
          <div className="row" style={{ gap: '8px', borderBottom: '1px solid var(--line)' }}>
            {[
              { key: 'overview', label: '概覽', icon: '📊' },
              { key: 'payments', label: `付款記錄 (${payments.length})`, icon: '💳' },
              { key: 'qr', label: 'QR Code', icon: '📱' },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`btn btn-ghost`}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  borderRadius: '8px 8px 0 0',
                  borderBottom: activeTab === tab.key ? '3px solid var(--gold)' : '3px solid transparent',
                  background: activeTab === tab.key ? 'var(--card)' : 'transparent',
                  fontWeight: activeTab === tab.key ? '700' : '500',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="card" style={{ marginTop: '0', borderTop: 'none', paddingTop: '20px' }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              {/* 基本資訊 */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                  基本資訊
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="sub">銷帳編號</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{bill.id}</span>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="sub">收款戶</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{shortenAddress(bill.payeeAddress, 4, 4)}</span>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="sub">建立時間</span>
                    <span>{formatDate(bill.createdAt)}</span>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="sub">截止時間</span>
                    <span style={{ color: timeRemaining.color, fontWeight: '600' }}>
                      {formatDate(bill.deadline * 1000)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="divider"></div>
              
              {/* 資產規則 */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                  資產規則
                </h3>
                {bill.assetRules.map((rule, index) => (
                  <div key={index} className="card" style={{ background: 'var(--panel)', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '700' }}>
                          {rule.asset.symbol}
                        </div>
                        <div className="sub" style={{ fontSize: '12px' }}>
                          {rule.asset.name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--gold)' }}>
                          <AmountDisplay 
                            value={rule.totalRequired} 
                            decimals={rule.asset.decimals}
                            symbol={rule.asset.symbol}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="divider" style={{ margin: '12px 0' }}></div>
                    
                    <div>
                      <div className="sub" style={{ marginBottom: '8px', fontWeight: '600' }}>
                        接受的鏈 ({rule.chainLimits.length})
                      </div>
                      <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                        {rule.chainLimits.map((limit) => (
                          <div key={limit.chainId} className="card" style={{ padding: '8px 12px', background: 'var(--bg)' }}>
                            <ChainBadge chainId={limit.chainId} showName={true} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                付款記錄
              </h3>
              
              {/* 按資產分組顯示付款狀態 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {bill.assetRules.map((rule, ruleIndex) => {
                  const isNFT = rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155'
                  
                  // 計算該資產的總已收金額
                  const assetPayments = payments.filter(p => p.assetSymbol === rule.asset.symbol)
                  const totalReceived = assetPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
                  const totalRequired = parseFloat(rule.totalRequired)
                  const progressPercent = totalRequired > 0 ? (totalReceived / totalRequired) * 100 : 0
                  
                  return (
                    <div key={ruleIndex} className="card" style={{ background: 'var(--bg)' }}>
                      {/* 資產標題 */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '16px',
                        paddingBottom: '16px',
                        borderBottom: '1px solid var(--line)'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            {isNFT && <span style={{ fontSize: '24px' }}>🖼</span>}
                            <span style={{ fontSize: '18px', fontWeight: '700' }}>
                              {rule.asset.collectionName || rule.asset.name || rule.asset.symbol}
                            </span>
                            <span className="chip" style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {rule.asset.type}
                            </span>
                          </div>
                          
                          {isNFT && rule.asset.tokenId && (
                            <div className="sub" style={{ fontSize: '11px', marginBottom: '4px' }}>
                              Token ID: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{rule.asset.tokenId}</span>
                            </div>
                          )}
                          
                          {rule.asset.address && (
                            <div className="sub" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                              {shortenAddress(rule.asset.address, 8, 6)}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'monospace' }}>
                            {isNFT ? `×${Math.floor(totalRequired)}` : totalRequired.toFixed(2)}
                          </div>
                          <div className="sub" style={{ fontSize: '11px' }}>
                            {isNFT ? '需求數量' : rule.asset.symbol}
                          </div>
                        </div>
                      </div>
                      
                      {/* 進度條 */}
                      {!isNFT && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <span className="sub" style={{ fontSize: '12px' }}>收款進度</span>
                            <span style={{ fontSize: '13px', fontWeight: '700' }}>
                              <span style={{ color: 'var(--success)' }}>{totalReceived.toFixed(2)}</span>
                              {' / '}
                              <span>{totalRequired.toFixed(2)}</span>
                              {' '}
                              <span className="sub">{rule.asset.symbol}</span>
                            </span>
                          </div>
                          <div style={{ 
                            width: '100%', 
                            height: '8px', 
                            background: 'var(--panel)', 
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${Math.min(progressPercent, 100)}%`,
                              height: '100%',
                              background: progressPercent >= 100 ? 'var(--success)' : 'var(--gold)',
                              transition: 'width 0.3s ease'
                            }}></div>
                          </div>
                        </div>
                      )}
                      
                      {/* 各鏈付款詳情 */}
                      <div>
                        <div className="sub" style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>
                          各鏈付款狀態 ({rule.chainLimits.length} 條鏈)
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {rule.chainLimits.map((limit) => {
                            // 查找該鏈上的付款記錄
                            const chainPayments = assetPayments.filter(p => p.chainId === limit.chainId)
                            const chainTotal = chainPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
                            const hasPayment = chainPayments.length > 0
                            
                            return (
                              <div 
                                key={limit.chainId} 
                                className="card" 
                                style={{ 
                                  padding: '12px',
                                  background: 'var(--panel)',
                                  border: hasPayment ? '1px solid var(--success-dim)' : '1px solid var(--line)'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ChainBadge chainId={limit.chainId} showName={true} />
                                    {hasPayment ? (
                                      <span className="pill success" style={{ fontSize: '10px' }}>
                                        ✓ 已收款
                                      </span>
                                    ) : (
                                      <span className="pill" style={{ fontSize: '10px', background: 'var(--muted-dim)', color: 'var(--muted)' }}>
                                        尚未轉帳
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div style={{ textAlign: 'right' }}>
                                    {hasPayment ? (
                                      <>
                                        <div style={{ 
                                          fontSize: '16px', 
                                          fontWeight: '700', 
                                          fontFamily: 'monospace',
                                          color: 'var(--success)'
                                        }}>
                                          {isNFT ? `×${Math.floor(chainTotal)}` : `${chainTotal.toFixed(6)} ${rule.asset.symbol}`}
                                        </div>
                                        <div className="sub" style={{ fontSize: '10px' }}>
                                          {chainPayments.length} 筆交易
                                        </div>
                                      </>
                                    ) : (
                                      <div className="sub" style={{ fontSize: '13px' }}>
                                        0.00 {rule.asset.symbol}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* 展開該鏈的詳細交易 */}
                                {hasPayment && chainPayments.length > 0 && (
                                  <div style={{ 
                                    marginTop: '12px', 
                                    paddingTop: '12px', 
                                    borderTop: '1px solid var(--line)'
                                  }}>
                                    {chainPayments.map((payment) => (
                                      <div 
                                        key={payment.id}
                                        style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          padding: '8px',
                                          background: 'var(--bg)',
                                          borderRadius: '6px',
                                          marginBottom: '6px'
                                        }}
                                      >
                                        <div style={{ flex: 1 }}>
                                          <div className="sub" style={{ fontSize: '11px', marginBottom: '2px' }}>
                                            txHash: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                                              {payment.txHash ? shortenAddress(payment.txHash as `0x${string}`, 8, 6) : 'N/A'}
                                            </span>
                                          </div>
                                          <div className="sub" style={{ fontSize: '10px' }}>
                                            {formatDate(payment.timestamp)}
                                          </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ 
                                            fontSize: '13px', 
                                            fontWeight: '700',
                                            fontFamily: 'monospace'
                                          }}>
                                            {payment.amount}
                                          </span>
                                          
                                          <span className={`pill ${
                                            payment.status === 'confirmed' ? 'success' : 
                                            payment.status === 'pending' ? 'warning' : 'error'
                                          }`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                                            {payment.status === 'confirmed' ? '✓' : 
                                             payment.status === 'pending' ? '⏳' : '✗'}
                                          </span>
                                          
                                          {payment.txHash && (
                                            <a
                                              href={getExplorerUrl(limit.chainId, payment.txHash)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              style={{ 
                                                fontSize: '16px',
                                                textDecoration: 'none',
                                                opacity: 0.6,
                                                transition: 'opacity 0.2s'
                                              }}
                                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                            >
                                              ↗
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {bill.assetRules.length === 0 && (
                <EmptyState
                  icon="list"
                  title="尚無資產規則"
                  description="此帳單未設定任何資產規則"
                />
              )}
            </div>
          )}
          
          {/* QR Code Tab */}
          {activeTab === 'qr' && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                付款 QR Code
              </h3>
              <p className="sub" style={{ marginBottom: '20px' }}>
                付款人可掃描此 QR Code 進行付款，或使用下方連結直接訪問付款頁面。
              </p>
              <QRCard bill={bill} />
            </div>
          )}
        </div>
      </div>
    </MerchantLayout>
  )
}

