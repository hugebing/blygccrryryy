/**
 * 首頁 - 角色選擇與功能導航
 * 區分付款人與收款戶兩種角色
 */

'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from 'wagmi'
import MerchantLayout from './components/layouts/MerchantLayout'

export default function HomePage() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [showDemoBills, setShowDemoBills] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // 付款人功能
  const payerFeatures = [
    {
      title: '掃描付款',
      description: '掃描收款戶提供的 QR Code 進行付款',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      action: () => router.push('/scan'),
      highlight: false,
    },
    {
      title: '付款帳單',
      description: '查看您的付款歷史記錄',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      action: () => router.push('/payer/payments'),
      highlight: false,
    },
    {
      title: '查看示範帳單',
      description: '體驗多鏈付款流程（USDT、NFT）',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      action: () => setShowDemoBills(true),
      highlight: false,
    },
    // {
    //   title: '輸入銷帳編號',
    //   description: '手動輸入銷帳編號查看',
    //   icon: (
    //     <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    //     </svg>
    //   ),
    //   action: () => {
    //     const billId = prompt('請輸入銷帳編號：')
    //     if (billId) router.push(`/i/${billId}`)
    //   },
    //   highlight: false,
    // },
  ]
  
  // 商戶功能
  const merchantFeatures = [
    {
      title: '建立帳單',
      description: '建立多鏈付款意圖',
      href: '/m/bills/new',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      title: '帳單管理',
      description: '查看所有帳單',
      href: '/m/bills',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    
    {
      title: 'Vault 管理',
      description: '查看各鏈 Vault',
      href: '/m/vaults',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      title: '對帳銷帳',
      description: '財務對帳與 ERP',
      href: '/m/reconciliation',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
  ]
  
  return (
    <MerchantLayout>
      {/* Hero Section */}
      <div style={{ paddingTop: '20px', paddingBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: 'clamp(32px, 8vw, 48px)', 
          fontWeight: '900', 
          marginBottom: '16px',
          background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-2) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          咔鏘 Ka-ching
        </h1>
        <p className="muted" style={{ fontSize: 'clamp(14px, 4vw, 18px)', marginBottom: '12px' }}>
          多鏈加密貨幣收付款平台
        </p>
        <p className="sub" style={{ maxWidth: '600px', margin: '0 auto', lineHeight: '1.6', padding: '0 16px' }}>
          一次簽名，跨鏈付款 • 支援 USDT、NFT、RWA • 無需橋接，降低風險
        </p>
      </div>
      
      {/* 雙欄佈局 - 付款人 vs 商戶 */}
      <div style={{ paddingBottom: '60px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
          gap: 'clamp(20px, 5vw, 40px)',
          alignItems: 'start'
        }}>
          
          {/* 左側 - 付款人功能 */}
          <div>
            <div style={{ 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--info), var(--info-dim))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '24px', height: '24px', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                  付款
                </h2>
                <p className="sub" style={{ fontSize: '12px', margin: 0 }}>
                  一般用戶付款功能
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {payerFeatures.map((feature, index) => (
                <button
                  key={index}
                  onClick={feature.action}
                  className="card"
                  style={{ 
                    padding: '20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: feature.highlight ? '2px solid var(--info)' : '1px solid var(--line)',
                    background: feature.highlight ? 'var(--info-dim)' : 'var(--card)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.borderColor = 'var(--info)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = feature.highlight ? 'var(--info)' : 'var(--line)'
                  }}
                >
                  {feature.highlight && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'var(--info)',
                      color: 'var(--bg)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}>
                      推薦
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '12px',
                      background: 'var(--info-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--info)',
                      flexShrink: 0
                    }}>
                      {feature.icon}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
                        {feature.title}
                      </h3>
                      <p className="sub" style={{ fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                        {feature.description}
                      </p>
                    </div>
                    
                    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', color: 'var(--info)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
            
            {/* 付款人提示 */}
            <div className="card" style={{ marginTop: '20px', background: 'var(--info-dim)', border: '1px solid var(--info)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', color: 'var(--info)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--info)' }}>
                    付款流程
                  </div>
                  <div className="sub" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                    1️⃣ 掃描收款戶 QR Code<br />
                    2️⃣ 查看帳單資訊<br />
                    3️⃣ 選擇付款鏈與金額<br />
                    4️⃣ 簽名確認，一次完成
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 右側 - 商戶功能 */}
          <div>
            <div style={{ 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '24px', height: '24px', color: 'var(--bg)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                  收款
                </h2>
                <p className="sub" style={{ fontSize: '12px', margin: 0 }}>
                  收款與帳單管理
                </p>
              </div>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px'
            }}>
              {merchantFeatures.map((feature, index) => (
                <button
                  key={index}
                  onClick={() => router.push(feature.href)}
                  className="card"
                  style={{ 
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '1px solid var(--line)',
                    background: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gold)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px',
                    background: 'var(--gold-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--gold)'
                  }}>
                    {feature.icon}
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>
                      {feature.title}
                    </div>
                    <div className="sub" style={{ fontSize: '12px' }}>
                      {feature.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* 商戶提示 */}
            <div className="card" style={{ marginTop: '20px', background: 'var(--gold-dim)', border: '1px solid var(--gold)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', color: 'var(--gold)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--gold)' }}>
                    收款戶優勢
                  </div>
                  <div className="sub" style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--gold-2)' }}>
                    ✓ 支援多鏈收款，降低風險<br />
                    ✓ 無需橋接，資產不搬鏈<br />
                    ✓ 自動對帳，ERP 整合<br />
                    ✓ 原子化結算，安全可靠
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ 
        background: 'var(--panel)', 
        borderTop: '1px solid var(--line)',
        padding: '40px 0',
        marginTop: '40px',
        marginLeft: '-24px',
        marginRight: '-24px',
        marginBottom: '-24px'
      }}>
        <div style={{ padding: '0 clamp(16px, 4vw, 24px)' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: 'clamp(20px, 4vw, 32px)',
            marginBottom: '32px'
          }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
                關於平台
              </h4>
              <p className="sub" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                咔鏘是多鏈加密貨幣收付款平台，支援 USDT、NFT、RWA 等多種資產的跨鏈支付。
              </p>
            </div>
            
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
                核心特色
              </h4>
              <ul className="sub" style={{ fontSize: '12px', lineHeight: '1.8' }}>
                <li>• 一次簽名，多鏈付款</li>
                <li>• 無需跨鏈橋接</li>
                <li>• 原子化結算機制</li>
                <li>• 完整的對帳功能</li>
              </ul>
            </div>
            
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
                支援鏈
              </h4>
              <div className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
                {['Ethereum', 'Polygon', 'Base', 'Arbitrum', 'BSC'].map((chain) => (
                  <span key={chain} className="chip" style={{ fontSize: '11px', padding: '4px 8px' }}>
                    {chain}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
            <p className="sub" style={{ fontSize: '12px' }}>
              © 2025 咔鏘. Built with Next.js 14 + Wagmi v2 + RainbowKit
            </p>
          </div>
        </div>
      </div>
      
      
      {/* Demo Bills Modal */}
      {mounted && showDemoBills && createPortal(
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0, 0, 0, 0.8)', 
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowDemoBills(false)}
        >
          <div 
            className="card" 
            style={{ maxWidth: '600px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                選擇示範帳單類型
              </h3>
              <button
                onClick={() => setShowDemoBills(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--line)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="sub" style={{ marginBottom: '20px' }}>
              體驗不同類型的多鏈付款流程
            </p>
            
            <div className="divider" style={{ marginBottom: '20px' }}></div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* USDT 帳單 */}
              <button
                className="card"
                onClick={() => {
                  setShowDemoBills(false)
                  router.push('/i/bill-2025-0001')
                }}
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid var(--line)',
                  background: 'var(--panel)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gold)'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line)'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #26a17b, #50af95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#fff',
                    flexShrink: 0
                  }}>
                    ₮
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '700' }}>混合資產付款</span>
                      <span className="chip" style={{ fontSize: '10px', padding: '2px 6px' }}>ERC20</span>
                      <span className="chip" style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--warning-dim)', color: 'var(--warning)' }}>ERC721</span>
                    </div>
                    <p className="sub" style={{ fontSize: '12px', marginBottom: '8px' }}>
                      5,000 USDT + 1 個 NFT 憑證 - 體驗多種資產組合付款
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="sub" style={{ fontSize: '11px' }}>銷帳編號:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600' }}>bill-2025-0001</span>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* ERC721 NFT 帳單 */}
              <button
                className="card"
                onClick={() => {
                  setShowDemoBills(false)
                  router.push('/i/bill-2025-0006')
                }}
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid var(--line)',
                  background: 'var(--panel)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gold)'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line)'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    🖼
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '700' }}>NFT 藝術品</span>
                      <span className="chip" style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--warning-dim)', color: 'var(--warning)' }}>ERC721</span>
                    </div>
                    <p className="sub" style={{ fontSize: '12px', marginBottom: '8px' }}>
                      Crypto Art Collection - Token #5678（Base Sepolia）
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="sub" style={{ fontSize: '11px' }}>銷帳編號:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600' }}>bill-2025-0006</span>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* QR Scanner Modal (佔位符) */}
      {mounted && showQRScanner && createPortal(
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0, 0, 0, 0.8)', 
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="card" style={{ maxWidth: '500px', margin: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
              掃描 QR Code
            </h3>
            <p className="sub" style={{ marginBottom: '20px' }}>
              QR Code 掃描功能開發中...<br />
              目前請使用「查看示範帳單」或「輸入銷帳編號」
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowQRScanner(false)}
              style={{ width: '100%' }}
            >
              關閉
            </button>
          </div>
        </div>,
        document.body
      )}
    </MerchantLayout>
  )
}
