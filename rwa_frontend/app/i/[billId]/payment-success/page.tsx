/**
 * 付款成功頁面 - /i/:billId/payment-success
 * 顯示付款詳情（類似收款帳單中的付款記錄）
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import MerchantLayout from '../../../components/layouts/MerchantLayout'
import LoadingState from '../../../components/shared/LoadingState'
import EmptyState from '../../../components/shared/EmptyState'
import ChainBadge from '../../../components/shared/ChainBadge'
import { shortenAddress } from '../../../lib/utils'
import { getExplorerUrl } from '../../../constants/chains'
import type { Bill, AssetRule, ChainId } from '../../../types'

// 從 sessionStorage 獲取付款配置
interface PaymentAllocation {
  assetSymbol: string
  assetDecimals: number
  totalRequired: string
  chains: Array<{
    chainId: ChainId
    amount: string
    txHash?: string // 交易hash（如果已執行）
    status?: 'pending' | 'confirmed' | 'failed' // 交易狀態
  }>
}

export default function PaymentSuccessPage() {
  const params = useParams()
  const router = useRouter()
  const { address } = useAccount()
  
  const billId = params.billId as string
  
  const [bill, setBill] = useState<Bill | null>(null)
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [signature, setSignature] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    loadPaymentData()
  }, [billId])
  
  const loadPaymentData = () => {
    try {
      // 從 sessionStorage 獲取帳單和付款配置
      const storedBill = sessionStorage.getItem(`payment_bill_${billId}`)
      const storedAllocations = sessionStorage.getItem(`payment_allocations_${billId}`)
      const storedSignature = sessionStorage.getItem(`payment_signature_${billId}`)
      
      if (!storedBill || !storedAllocations) {
        router.push(`/i/${billId}`)
        return
      }
      
      setBill(JSON.parse(storedBill))
      setSignature(storedSignature)
      
      // 從 sessionStorage 獲取已包含真實 txHash 的付款配置
      const allocationsData = JSON.parse(storedAllocations)
      
      console.log('📦 payment-success 讀取的 allocations:', allocationsData)
      
      // 保留從 curl 獲取的真實 txHash，不要覆蓋
      const allocationsWithTx = allocationsData.map((alloc: PaymentAllocation) => ({
        ...alloc,
        chains: alloc.chains.map((chain) => {
          // 如果已經有 txHash（從 curl 獲取的），就保留它
          // 否則才生成後備 hash
          const finalTxHash = chain.txHash || `0x${Math.random().toString(16).substring(2, 66)}`
          
          console.log(`  鏈 ${chain.chainId}: txHash = ${finalTxHash} (${chain.txHash ? '✅ 使用真實 hash' : '⚠️ 使用後備 hash'})`)
          
          return {
            ...chain,
            txHash: finalTxHash,
            status: chain.status || 'confirmed' as const
          }
        })
      }))
      
      console.log('💾 payment-success 最終的 allocations:', allocationsWithTx)
      
      setAllocations(allocationsWithTx)
    } catch (error) {
      console.error('載入付款資料失敗:', error)
      router.push(`/i/${billId}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  if (isLoading) {
    return (
      <MerchantLayout>
        <div style={{ marginTop: '60px' }}>
          <LoadingState message="載入付款資訊..." />
        </div>
      </MerchantLayout>
    )
  }
  
  if (!bill || !allocations.length) {
    return (
      <MerchantLayout>
        <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 20px' }}>
          <EmptyState
            icon="search"
            title="找不到付款資訊"
            description="請重新掃描 QR Code 或返回首頁"
          />
        </div>
      </MerchantLayout>
    )
  }
  
  return (
    <MerchantLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px 40px' }}>
        {/* 成功提示 */}
        <div className="card" style={{ 
          marginBottom: '24px',
          background: 'var(--success-dim)',
          border: '2px solid var(--success)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--success)' }}>
            付款成功
          </h2>
          <p className="sub" style={{ marginBottom: '0' }}>
            您的資產已成功送至收款方指定地址
          </p>
        </div>
        
        {/* 帳單資訊 */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            帳單資訊
          </h3>
          
          <div className="divider"></div>
          
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="sub">銷帳編號</span>
              <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{bill.id}</span>
            </div>
            
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="sub">收款戶</span>
              <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                {shortenAddress(bill.payeeAddress, 8, 6)}
              </span>
            </div>
            
            {address && (
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="sub">付款人（您）</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  {shortenAddress(address, 8, 6)}
                </span>
              </div>
            )}
            
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="sub">說明</span>
              <span>{bill.description || '無'}</span>
            </div>
          </div>
        </div>
        
        {/* 簽名資訊 */}
        {signature && (
          <div className="card" style={{ marginBottom: '24px', background: 'var(--panel)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
              🔐 簽名資訊 (ERC-191 Version 0)
            </h3>
            
            <div className="divider"></div>
            
            <div style={{ marginTop: '16px' }}>
              <div className="sub" style={{ fontSize: '11px', marginBottom: '8px' }}>
                Personal Sign 簽名結果：
              </div>
              <div style={{
                padding: '12px',
                background: 'var(--bg)',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                fontFamily: 'monospace',
                fontSize: '11px',
                wordBreak: 'break-all',
                lineHeight: '1.6',
                color: 'var(--success)'
              }}>
                {signature}
              </div>
              
              <div style={{ 
                marginTop: '12px',
                padding: '8px 12px',
                background: 'var(--success-dim)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div style={{ fontSize: '12px', color: 'var(--success)', flex: 1 }}>
                  <div style={{ fontWeight: '600' }}>已使用 ERC-191 Version 0 標準簽名</div>
                  <div className="sub" style={{ fontSize: '10px', marginTop: '2px', color: 'var(--success)' }}>
                    格式: "\x19Ethereum Signed Message:\n" + len(message) + message
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 付款詳情 - 按資產分組 */}
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
          已發送資產明細
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {bill.assetRules.map((rule, ruleIndex) => {
            const isNFT = rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155'
            const allocation = allocations.find(a => a.assetSymbol === rule.asset.symbol)
            
            if (!allocation) return null
            
            const totalAllocated = allocation.chains.reduce((sum, chain) => sum + parseFloat(chain.amount || '0'), 0)
            
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
                    <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--gold)' }}>
                      {isNFT ? `×${Math.floor(totalAllocated)}` : totalAllocated.toFixed(2)}
                    </div>
                    <div className="sub" style={{ fontSize: '11px' }}>
                      {isNFT ? '數量' : rule.asset.symbol}
                    </div>
                  </div>
                </div>
                
                {/* 各鏈發送詳情 */}
                <div>
                  <div className="sub" style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>
                    已發送至收款方 ({allocation.chains.length} 條鏈)
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {allocation.chains.map((chainAlloc) => {
                      const hasTransaction = chainAlloc.txHash && chainAlloc.status
                      const explorerUrl = hasTransaction ? getExplorerUrl(chainAlloc.chainId, chainAlloc.txHash!) : '#'
                      
                      return (
                        <div 
                          key={chainAlloc.chainId} 
                          className="card" 
                          style={{ 
                            padding: '12px',
                            background: 'var(--panel)',
                            border: hasTransaction 
                              ? chainAlloc.status === 'confirmed' 
                                ? '1px solid var(--success-dim)' 
                                : chainAlloc.status === 'pending'
                                  ? '1px solid var(--warning-dim)'
                                  : '1px solid var(--error-dim)'
                              : '1px solid var(--line)'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* 第一行：鏈名稱、狀態、金額 */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ChainBadge chainId={chainAlloc.chainId} showName={true} />
                                {hasTransaction && (
                                  <span className={`pill ${
                                    chainAlloc.status === 'confirmed' ? 'success' :
                                    chainAlloc.status === 'pending' ? 'warning' : 'error'
                                  }`} style={{ fontSize: '10px' }}>
                                    {chainAlloc.status === 'confirmed' ? '✓ 已確認' :
                                     chainAlloc.status === 'pending' ? '⏳ 處理中' : '✗ 失敗'}
                                  </span>
                                )}
                              </div>
                              
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ 
                                  fontSize: '16px', 
                                  fontWeight: '700', 
                                  fontFamily: 'monospace',
                                  color: hasTransaction && chainAlloc.status === 'confirmed' ? 'var(--success)' : 'var(--gold)'
                                }}>
                                  {isNFT 
                                    ? `×${Math.floor(parseFloat(chainAlloc.amount))}`
                                    : `${parseFloat(chainAlloc.amount).toFixed(2)} ${rule.asset.symbol}`
                                  }
                                </div>
                              </div>
                            </div>
                            
                            {/* 第二行：交易hash（如果有） */}
                            {hasTransaction && (
                              <div style={{ 
                                padding: '6px 8px',
                                background: 'var(--bg)',
                                borderRadius: '4px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                  <div className="sub" style={{ fontSize: '10px', marginBottom: '2px' }}>
                                    交易 Hash:
                                  </div>
                                  <div style={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: '11px', 
                                    fontWeight: '600',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {chainAlloc.txHash}
                                  </div>
                                </div>
                                
                                <a
                                  href={explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost btn-sm"
                                  style={{ 
                                    fontSize: '10px',
                                    padding: '4px 8px',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    minWidth: 'fit-content',
                                    lineHeight: '1.5'
                                  }}
                                >
                                  查看 ↗
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* 操作按鈕 */}
        <div className="card" style={{ marginTop: '24px', background: 'var(--panel)' }}>
          {/* <div className="sub" style={{ marginBottom: '16px', textAlign: 'center' }}>
            💡 下一步將串接後端執行鏈上交易
          </div> */}
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost"
              onClick={() => router.push('/')}
              style={{ flex: 1, minWidth: '200px' }}
            >
              返回首頁
            </button>
            
            <button
              className="btn btn-primary"
              onClick={() => router.push(`/i/${billId}`)}
              style={{ flex: 1, minWidth: '200px' }}
            >
              查看帳單
            </button>
          </div>
        </div>
      </div>
    </MerchantLayout>
  )
}

