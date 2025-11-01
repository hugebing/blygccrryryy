/**
 * Providers 組件 - 咔鏘 風格
 * 
 * 這個組件包裝所有需要的 Context Providers：
 * 1. WagmiProvider：提供 wagmi 的所有 hooks（如 useAccount, useBalance）
 * 2. QueryClientProvider：提供 React Query 的資料快取和狀態管理
 * 3. RainbowKitProvider：提供 RainbowKit 的錢包連接 UI 和功能
 * 
 * RainbowKit 提供什麼？
 * - 美觀的錢包連接按鈕和彈窗
 * - 支援多種錢包（MetaMask、WalletConnect、Coinbase 等）
 * - 自動處理錢包切換和斷開連接
 * - 完整的 TypeScript 支援
 */

'use client' // Next.js App Router 的客戶端組件標記

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { useState, type ReactNode } from 'react'
import { config } from '../lib/wagmi'
import { UIProvider } from './contexts/UIContext'

// 導入 RainbowKit 的 CSS 樣式
import '@rainbow-me/rainbowkit/styles.css'

// 自定義 咔鏘 主題配置
const customTheme = darkTheme({
  accentColor: '#9E844A',              // 金色強調色（與全局主題一致）
  accentColorForeground: '#0b0d10',    // 強調色上的文字顏色
  borderRadius: 'medium',               // 中等圓角
  fontStack: 'system',                  // 使用系統字體
  overlayBlur: 'small',                 // 背景模糊效果
})

// 進一步自定義顏色
customTheme.colors.modalBackground = '#11161c'    // Modal 背景
customTheme.colors.modalBorder = '#232a33'        // Modal 邊框
customTheme.colors.modalText = '#e6eaf0'          // Modal 文字
customTheme.colors.modalTextSecondary = '#a4afbd' // 次要文字
customTheme.colors.closeButton = '#a4afbd'        // 關閉按鈕
customTheme.colors.closeButtonBackground = '#12161c' // 關閉按鈕背景

export default function Providers({ children }: { children: ReactNode }) {
  // 為每個使用者 session 建立一個 QueryClient 實例
  // 使用 useState 確保在組件生命週期中只建立一次
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 設定資料過時時間（5 秒）
        // 在這個時間內，相同的查詢會使用快取資料
        staleTime: 5_000,
        
        // 設定資料快取時間（30 秒）
        // 超過這個時間，快取會被清除
        gcTime: 30_000,
        
        // 當視窗重新獲得焦點時，自動重新取得資料
        refetchOnWindowFocus: true,
      },
    },
  }))
  
  return (
    // WagmiProvider 必須在外層，因為它提供區塊鏈連接的狀態
    <WagmiProvider config={config}>
      {/* QueryClientProvider 提供資料快取管理 */}
      <QueryClientProvider client={queryClient}>
        {/* RainbowKitProvider 提供錢包連接 UI - 咔鏘 黑金主題 */}
        <RainbowKitProvider theme={customTheme}>
          {/* UIProvider 提供全局 UI 狀態管理 */}
          <UIProvider>
            {children}
          </UIProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}


