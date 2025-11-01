/**
 * Wagmi + RainbowKit 設定檔
 * 
 * 這個檔案定義了整個 dApp 的區塊鏈連接配置
 * - 支援的鏈：Sepolia、Base Sepolia、OP Sepolia（測試網）
 * - 自訂錢包列表：只顯示 imToken、MetaMask、Rainbow、WalletConnect
 */

import { http, createConfig } from 'wagmi'
import { sepolia, baseSepolia, optimismSepolia } from 'wagmi/chains'
import { 
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  imTokenWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'

// 自訂錢包列表
const wallets = [
  {
    groupName: '推薦',
    wallets: [
      imTokenWallet,      // imToken
      metaMaskWallet,     // MetaMask
      rainbowWallet,      // Rainbow
      walletConnectWallet,// WalletConnect
    ],
  },
]

// 創建連接器
const connectors = connectorsForWallets(wallets, {
  appName: 'FISCRWA',
  projectId: '92f1653f35b17cad9cf3c4a8f0347020',
})

// 創建 Wagmi 配置
export const config = createConfig({
  connectors,
  chains: [sepolia, baseSepolia, optimismSepolia],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [optimismSepolia.id]: http(),
  },
  ssr: true,
})

// 從 wagmi config 中匯出型別，方便在其他地方使用
declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}


