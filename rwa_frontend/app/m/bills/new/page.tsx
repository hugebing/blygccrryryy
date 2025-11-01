/**
 * 建立帳單頁面 - /m/bills/new
 * 收款戶建立多鏈付款意圖
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import MerchantLayout from '../../../components/layouts/MerchantLayout'
import RuleBuilder from '../../../components/merchant/RuleBuilder'
import QRCard from '../../../components/merchant/QRCard'
import { createBill } from '../../../services/mockData'
import type { AssetRule } from '../../../types'
import { shortenAddress } from '../../../lib/utils'

export default function NewBillPage() {
  const router = useRouter()
  
  // 基本資訊
  const [description, setDescription] = useState('')
  const { address } = useAccount()
  
  // 截止時間
  const [expiryValue, setExpiryValue] = useState(1)
  const [expiryUnit, setExpiryUnit] = useState<'hours' | 'days'>('hours')
  
  // 資產規則
  const [assetRules, setAssetRules] = useState<AssetRule[]>([])
  
  // 已建立的帳單（用於顯示 QR Code）
  const [createdBill, setCreatedBill] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  
  // 驗證表單
  const isFormValid = () => {
    if (!description.trim()) return false
    if (assetRules.length === 0) return false
    
    // 檢查每個資產規則
    for (const rule of assetRules) {
      if (!rule.totalRequired || parseFloat(rule.totalRequired) <= 0) return false
      if (rule.chainLimits.length === 0) return false
    }
    
    return true
  }
  
  // 建立帳單
  const handleCreateBill = async () => {
    if (!isFormValid()) {
      alert('請填寫完整資訊')
      return
    }
    
    setIsCreating(true)
    try {
      // 計算截止時間（秒）
      const secondsMultiplier = expiryUnit === 'hours' ? 3600 : 86400
      const deadline = Math.floor(Date.now() / 1000) + expiryValue * secondsMultiplier
      
      const bill = await createBill({
        description,
        payeeAddress: address as `0x${string}`,
        assetRules,
        deadline,
      })
      
      setCreatedBill(bill)
    } catch (error) {
      console.error('建立帳單失敗：', error)
      alert('建立帳單失敗，請稍後再試')
    } finally {
      setIsCreating(false)
    }
  }
  
  // 如果已建立帳單，顯示成功頁面
  if (createdBill) {
    return (
      <MerchantLayout>
        <div>
          <div className="card" style={{ marginBottom: '20px', textAlign: 'center', padding: '40px' }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: 'var(--success)' }} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>
              帳單建立成功！
            </h2>
            
            <p className="muted" style={{ marginBottom: '24px' }}>
              付款人可以掃描下方 QR Code 進行付款
            </p>
            
            <div style={{ display: 'inline-flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className="pill">
                銷帳編號：{createdBill.id}
              </span>
            </div>
          </div>
          
          {/* QR Code Card */}
          <QRCard bill={createdBill} />
          
          {/* 操作按鈕 */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-ghost"
              onClick={() => router.push('/m/bills/new')}
              style={{ flex: '1 1 200px' }}
            >
              建立新帳單
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => router.push(`/m/bills/${createdBill.id}`)}
              style={{ flex: '1 1 200px' }}
            >
              查看帳單詳情
            </button>
          </div>
        </div>
      </MerchantLayout>
    )
  }
  
  // 建立表單
  return (
    <MerchantLayout>
      <div>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>
            建立付款帳單
          </h1>
          <p className="muted">設定多鏈付款規則與截止時間</p>
        </div>
        
        <div className="grid">
          {/* 左側 - 表單 */}
          <div>
            {/* 基本資訊 */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                基本資訊
              </h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label className="sub" style={{ display: 'block', marginBottom: '8px' }}>
                  收款戶地址
                </label>
                <div style={{ 
                  padding: '12px',
                  background: 'var(--panel)',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  border: '1px solid var(--line)'
                }}>
                  {address ? shortenAddress(address) : '請先連接錢包'}
              </div>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label className="sub" style={{ display: 'block', marginBottom: '8px' }}>
                  描述 *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="請輸入帳單描述..."
                  style={{ width: '100%', minHeight: '80px' }}
                  required
                />
              </div>
              
              <div>
                <label className="sub" style={{ display: 'block', marginBottom: '8px' }}>
                  截止時間
                </label>
                
                {/* 單位選擇 */}
                <div className="row" style={{ gap: '8px', marginBottom: '12px' }}>
                  <button
                    className={`chip toggle ${expiryUnit === 'hours' ? 'sel' : ''}`}
                    onClick={() => setExpiryUnit('hours')}
                    style={{ flex: 1 }}
                  >
                    小時
                  </button>
                  <button
                    className={`chip toggle ${expiryUnit === 'days' ? 'sel' : ''}`}
                    onClick={() => setExpiryUnit('days')}
                    style={{ flex: 1 }}
                  >
                    天數
                  </button>
                </div>
                
                {/* 快捷選項 */}
                <div className="row" style={{ gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {expiryUnit === 'hours' ? (
                    <>
                      {[1, 2, 6, 12, 24].map((hours) => (
                        <button
                          key={hours}
                          className={`chip toggle ${expiryValue === hours ? 'sel' : ''}`}
                          onClick={() => setExpiryValue(hours)}
                        >
                          {hours} 小時
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {[1, 3, 7, 14, 30].map((days) => (
                        <button
                          key={days}
                          className={`chip toggle ${expiryValue === days ? 'sel' : ''}`}
                          onClick={() => setExpiryValue(days)}
                        >
                          {days} 天
                        </button>
                      ))}
                    </>
                  )}
                </div>
                
                {/* 自訂輸入 */}
                <div>
                  <label className="sub" style={{ display: 'block', marginBottom: '8px', fontSize: '11px' }}>
                    或自訂數值
                  </label>
                  <input
                    type="number"
                    value={expiryValue}
                    onChange={(e) => setExpiryValue(parseInt(e.target.value) || 1)}
                    min="1"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
            
            {/* RuleBuilder - 資產規則 */}
            <RuleBuilder
              assetRules={assetRules}
              onChange={setAssetRules}
            />
          </div>
          
          {/* 右側 - 預覽 */}
          <div>
            <div className="card" style={{ position: 'sticky', top: '80px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                帳單預覽
              </h3>
              
              <div className="divider"></div>
              
              {/* 摘要資訊 */}
              {description && (
                <div style={{ marginBottom: '12px' }}>
                  <span className="sub">描述</span>
                  <div style={{ marginTop: '4px' }}>{description}</div>
                </div>
              )}
              
              <div style={{ marginBottom: '12px' }}>
                <span className="sub">截止時間</span>
                <div style={{ marginTop: '4px' }}>
                  {expiryValue} {expiryUnit === 'hours' ? '小時' : '天'}後
                </div>
              </div>
              
              {assetRules.length > 0 && (
                <>
                  <div className="divider"></div>
                  <div style={{ marginBottom: '12px' }}>
                    <span className="sub">資產需求</span>
                    {assetRules.map((rule, index) => (
                      <div key={index} style={{ marginTop: '8px' }}>
                        <div style={{ fontWeight: '700', fontFamily: 'monospace' }}>
                          {rule.totalRequired} {rule.asset.symbol}
                        </div>
                        <div className="sub" style={{ fontSize: '11px' }}>
                          {rule.chainLimits.length} 條鏈可用
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {!isFormValid() && (
                <>
                  <div className="divider"></div>
                  <div className="sub" style={{ color: 'var(--warning)' }}>
                    ⚠️ 請填寫完整資訊才能建立帳單
                  </div>
                </>
              )}
              
              {/* 建立按鈕 */}
              <div className="divider"></div>
              <button
                className="btn btn-primary"
                onClick={handleCreateBill}
                disabled={!isFormValid() || isCreating}
                style={{ width: '100%' }}
              >
                {isCreating ? (
                  <>
                    <span className="loading"></span>
                    建立中...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    建立帳單
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  )
}

