/**
 * PayerLayout - 付款端 Layout（極簡版）
 * 僅顯示最小化的 Header 與錢包連接
 */

'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import WalletNav from '../WalletNav'

interface PayerLayoutProps {
  children: ReactNode
  showBackButton?: boolean
}

export default function PayerLayout({ children, showBackButton = false }: PayerLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Minimal Header */}
      <div className="sticky top-0 z-50 navbar">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 16px',
          gap: '16px',
          width: '100%'
        }}>
          {/* Logo or Back Button */}
          {showBackButton ? (
            <Link 
              href="/"
              className="btn btn-ghost btn-sm"
              style={{ padding: '8px 12px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="logo"></div>
              <div className="brand-text">
                <h1 style={{ fontSize: '17px', margin: '0', fontWeight: '800', whiteSpace: 'nowrap' }}>
                  咔鏘
                </h1>
              </div>
            </div>
          )}

          <div style={{ flex: '1 1 auto' }}></div>
          
          {/* Wallet */}
          <div style={{ flex: '0 0 auto' }}>
            <WalletNav />
          </div>
        </div>
      </div>

      {/* Content - 窄版適合付款流程 */}
      <div className="wrap" style={{ paddingTop: '20px', maxWidth: '800px' }}>
        {children}
      </div>
    </div>
  )
}

