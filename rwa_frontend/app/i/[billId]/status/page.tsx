/**
 * 付款進度追蹤頁面 - /i/:billId/status
 * 顯示各鏈的交易狀態與進度
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import MerchantLayout from '../../../components/layouts/MerchantLayout'
import LoadingState from '../../../components/shared/LoadingState'
import EmptyState from '../../../components/shared/EmptyState'
import ChainBadge from '../../../components/shared/ChainBadge'
import { getBillById, getPaymentProgress } from '../../../services/mockData'
import type { Bill, PaymentProgress, PaymentStage } from '../../../types'

export default function PaymentStatusPage() {
  const params = useParams()
  const router = useRouter()
  const { address } = useAccount()
  const billId = params.billId as string
  
  const [bill, setBill] = useState<Bill | null>(null)
  const [progress, setProgress] = useState<PaymentProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    loadData()
    
    // 每 5 秒更新一次進度
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [billId])
  
  const loadData = async () => {
    try {
      const billData = await getBillById(billId)
      const progressData = await getPaymentProgress(billId)
      
      setBill(billData)
      setProgress(progressData)
    } catch (err) {
      console.error('載入失敗：', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 獲取階段配置
  const getStageConfig = (stage: PaymentStage) => {
    const configs = {
      idle: { label: '未開始', color: 'var(--muted)', icon: '⚪', progress: 0 },
      approving: { label: '授權中', color: 'var(--info)', icon: '🔄', progress: 20 },
      approved: { label: '已授權', color: 'var(--info)', icon: '✓', progress: 40 },
      depositing: { label: '入金中', color: 'var(--warning)', icon: '💸', progress: 60 },
      confirming: { label: '確認中', color: 'var(--warning)', icon: '⏳', progress: 80 },
      confirmed: { label: '已確認', color: 'var(--success)', icon: '✅', progress: 100 },
      failed: { label: '失敗', color: 'var(--error)', icon: '❌', progress: 0 },
    }
    return configs[stage] || configs.idle
  }
  
  if (isLoading) {
    return (
      <MerchantLayout>
        <LoadingState message="載入付款進度..." />
      </MerchantLayout>
    )
  }
  
  if (!bill || !progress) {
    return (
      <MerchantLayout>
        <EmptyState
          icon="payment"
          title="找不到付款記錄"
          description="請確認銷帳編號是否正確"
          action={{
            label: '返回',
            onClick: () => router.push('/'),
          }}
        />
      </MerchantLayout>
    )
  }
  
  const overallProgress = progress.isFulfilled ? 100 : 
    (progress.chainPayments.reduce((sum, p) => sum + getStageConfig(p.stage).progress, 0) / 
    progress.chainPayments.length)
  
  return (
    <MerchantLayout>
      <div style={{ marginTop: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => router.push(`/i/${billId}`)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>
              付款進度追蹤
            </h1>
          </div>
          <p className="muted">銷帳編號：{bill.id}</p>
        </div>
        
        {/* 整體進度 */}
        <div className="card" style={{ marginBottom: '24px', background: progress.isFulfilled ? 'var(--success-dim)' : 'var(--panel)', border: progress.isFulfilled ? '2px solid var(--success)' : '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
                {progress.isFulfilled ? '✅ 付款完成' : '⏳ 處理中'}
              </h2>
              <p className="sub">
                已付款 {progress.totalPaid} / {progress.totalRequired} USDT
              </p>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'monospace', color: progress.isFulfilled ? 'var(--success)' : 'var(--gold)' }}>
              {Math.round(overallProgress)}%
            </div>
          </div>
          
          {/* 進度條 */}
          <div style={{ height: '8px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                background: progress.isFulfilled ? 'var(--success)' : 'linear-gradient(90deg, var(--gold), var(--gold-2))',
                width: `${overallProgress}%`,
                transition: 'width 0.5s ease-in-out'
              }}
            />
          </div>
        </div>
        
        {/* 各鏈詳情 */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            各鏈付款狀態
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {progress.chainPayments.map((payment, index) => {
              const stageConfig = getStageConfig(payment.stage)
              const percentage = (parseFloat(payment.amount) / parseFloat(payment.required) * 100).toFixed(1)
              
              return (
                <div key={index} className="card" style={{ background: 'var(--panel)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <ChainBadge chainId={payment.chainId} showName={true} />
                      <div>
                        <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                          {payment.asset.symbol}
                        </div>
                        <div className="sub" style={{ fontSize: '12px' }}>
                          {payment.amount} / {payment.required}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div 
                        className="pill"
                        style={{ 
                          background: `${stageConfig.color}22`,
                          borderColor: stageConfig.color,
                          color: stageConfig.color,
                          marginBottom: '4px'
                        }}
                      >
                        {stageConfig.icon} {stageConfig.label}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'monospace', color: stageConfig.color }}>
                        {percentage}%
                      </div>
                    </div>
                  </div>
                  
                  {/* 進度條 */}
                  <div style={{ height: '6px', background: 'var(--bg)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        background: stageConfig.color,
                        width: `${stageConfig.progress}%`,
                        transition: 'width 0.5s ease-in-out'
                      }}
                    />
                  </div>
                  
                  {/* 交易資訊 */}
                  {payment.txHash && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                      <span className="sub" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                        Tx: {payment.txHash.slice(0, 10)}...{payment.txHash.slice(-8)}
                      </span>
                      {payment.confirmations !== undefined && (
                        <span className="sub" style={{ fontSize: '11px' }}>
                          {payment.confirmations} 確認
                        </span>
                      )}
                    </div>
                  )}
                  
                  {payment.errorMessage && (
                    <div style={{ marginTop: '8px', padding: '8px', background: 'var(--error-dim)', borderRadius: '4px', border: '1px solid var(--error)' }}>
                      <span className="sub" style={{ fontSize: '12px', color: 'var(--error)' }}>
                        ❌ {payment.errorMessage}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        {/* 操作按鈕 */}
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {progress.isFulfilled ? (
            <button
              className="btn btn-primary"
              onClick={() => router.push('/')}
              style={{ flex: '1 1 200px' }}
            >
              完成
            </button>
          ) : (
            <>
              <button
                className="btn btn-ghost"
                onClick={() => router.push(`/i/${billId}`)}
                style={{ flex: '1 1 200px' }}
              >
                返回帳單
              </button>
              <button
                className="btn btn-primary"
                onClick={loadData}
                style={{ flex: '1 1 200px' }}
              >
                🔄 重新整理
              </button>
            </>
          )}
        </div>
        
        {/* 提示 */}
        <div className="card" style={{ marginTop: '20px', background: 'var(--info-dim)', border: '1px solid var(--info)' }}>
          <div className="row" style={{ gap: '8px', alignItems: 'flex-start' }}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--info)' }}>
                自動追蹤進度
              </div>
              <div className="sub" style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--info)' }}>
                • 頁面每 5 秒自動更新一次<br />
                • 各鏈交易獨立執行，可能完成時間不同<br />
                • 所有鏈確認後才算付款完成
              </div>
            </div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  )
}
