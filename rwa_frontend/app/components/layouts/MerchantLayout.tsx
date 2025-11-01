/**
 * MerchantLayout - 收款戶端 Layout
 * 包含側邊導航與 Header
 */

'use client'

import { useState, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import WalletNav from '../WalletNav'

interface MerchantLayoutProps {
  children: ReactNode
}

export default function MerchantLayout({ children }: MerchantLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // 關閉 sidebar 當路由改變時
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])
  
  // 首頁
  const homeItem = {
    href: '/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    label: '首頁',
    description: '功能總覽',
  }
  
  // 付款功能
  const payerNavItems = [
    {
      href: '/scan',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      label: '掃描 QR Code',
      description: '掃描收款戶 QR Code',
    },
    {
      href: '/payer/payments',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      label: '付款帳單',
      description: '查看付款歷史記錄',
    },
    {
      href: '/i/bill-2025-0001',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      label: '示範帳單',
      description: '體驗付款',
    },
  ]
  
  // 商戶功能
  const merchantNavItems = [
    {
      href: '/m/bills/new',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      ),
      label: '建立帳單',
      description: '建立多鏈付款意圖',
    },
    {
      href: '/m/bills',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: '帳單列表',
      description: '查看所有帳單',
    },
    
    {
      href: '/m/vaults',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      label: 'Vault 管理',
      description: '多鏈保管箱狀態',
    },
    {
      href: '/m/reconciliation',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      label: '對帳銷帳',
      description: 'ERP 整合對帳',
    },
 
 
  ]
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 navbar">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 16px',
          gap: '16px',
          width: '100%'
        }}>
          {/* Logo */}
          <div 
            onClick={() => setIsSidebarOpen(true)}
            style={{ 
              display: 'flex', 
              gap: '10px', 
              alignItems: 'center',
              cursor: 'pointer',
              flex: '0 0 auto'
            }}
          >
            <div className="logo"></div>
            <div className="brand-text">
              <h1 style={{ fontSize: '17px', margin: '0 0 2px 0', fontWeight: '800', whiteSpace: 'nowrap' }}>
                咔鏘 Ka-ching
              </h1>
              <small className="muted brand-subtitle" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                收付平台
              </small>
            </div>
          </div>

          <div style={{ flex: '1 1 auto' }}></div>
          
          {/* Wallet */}
          <div style={{ flex: '0 0 auto' }}>
            <WalletNav />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="wrap" style={{ paddingTop: '20px', maxWidth: '1400px' }}>
        {children}
      </div>

      {/* Sidebar */}
      {mounted && isSidebarOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
          
          <div className="sidebar-menu" style={{
            position: 'relative',
            width: '320px',
            height: '100%',
            background: 'linear-gradient(180deg, #0f141a, #0d1117)',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ 
              padding: '20px', 
              borderBottom: '1px solid #1a212a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="logo" style={{ width: '36px', height: '36px' }}></div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', margin: '0', color: '#f4dfb0' }}>
                  咔鏘 Ka-ching
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="btn btn-circle btn-sm"
                style={{ background: 'transparent', border: '1px solid #2b3440' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {/* 首頁 */}
              <div style={{ marginBottom: '24px' }}>
                <Link 
                  href={homeItem.href}
                  style={{
                    display: 'block',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    marginBottom: '6px',
                    background: 'transparent',
                    border: 'none',
                    transition: 'all 0.2s',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      color: 'var(--text)',
                      transition: 'color 0.2s'
                    }}>
                      {homeItem.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '500',
                        color: 'var(--text)',
                        marginBottom: '2px'
                      }}>
                        {homeItem.label}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: 'var(--muted)',
                        lineHeight: '1.3'
                      }}>
                        {homeItem.description}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
              
              {/* 分隔線 */}
              <div style={{ 
                height: '1px', 
                background: 'linear-gradient(90deg, transparent, var(--line), transparent)',
                margin: '16px 0'
              }}></div>
              
              {/* 付款功能區 */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  color: 'var(--info)', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '0 16px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  付款功能
                </div>
                {payerNavItems.map((item, index) => {
                  const isActive = pathname === item.href
                  return (
                    <Link 
                      key={index}
                      href={item.href}
                      style={{
                        display: 'block',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        marginBottom: '6px',
                        background: isActive ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid transparent',
                        transition: 'all 0.2s',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          color: isActive ? 'var(--info)' : 'var(--muted)',
                          transition: 'color 0.2s'
                        }}>
                          {item.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: isActive ? '700' : '500',
                            color: isActive ? 'var(--info)' : 'var(--text)',
                            marginBottom: '2px'
                          }}>
                            {item.label}
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: 'var(--muted)',
                            lineHeight: '1.3'
                          }}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              
              {/* 分隔線 */}
              <div style={{ 
                height: '1px', 
                background: 'linear-gradient(90deg, transparent, var(--line), transparent)',
                margin: '16px 0'
              }}></div>
              
              {/* 收款功能區 */}
              <div>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  color: 'var(--gold)', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '0 16px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  收款功能
                </div>
                {merchantNavItems.map((item, index) => {
                  const isActive = pathname === item.href
                  return (
                    <Link 
                      key={index}
                      href={item.href}
                      style={{
                        display: 'block',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        marginBottom: '6px',
                        background: isActive ? 'rgba(158, 132, 74, 0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(158, 132, 74, 0.3)' : '1px solid transparent',
                        transition: 'all 0.2s',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          color: isActive ? 'var(--gold)' : 'var(--muted)',
                          transition: 'color 0.2s'
                        }}>
                          {item.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: isActive ? '700' : '500',
                            color: isActive ? 'var(--gold)' : 'var(--text)',
                            marginBottom: '2px'
                          }}>
                            {item.label}
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: 'var(--muted)',
                            lineHeight: '1.3'
                          }}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

