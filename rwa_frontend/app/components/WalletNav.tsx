/**
 * 錢包導航 - 咔鏘 風格側邊欄
 * 保留原有功能，套用新主題
 */

'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance, useReadContract } from 'wagmi'
import { formatEther, formatUnits } from 'viem'

// AA 錢包資產餘額（模擬數據）
const AA_WALLET_BALANCES = {
  usdt: {
    sepolia: { balance: '100', chainId: 11155111 as const },
    baseSepolia: { balance: '300', chainId: 84532 as const },
    opSepolia: { balance: '400', chainId: 11155420 as const },
  },
  nft: {
    erc1155_opSepolia: { count: 3, chainId: 11155420 as const, name: 'NFT Collection #1155' },
    erc721_baseSepolia: { count: 2, chainId: 84532 as const, name: 'NFT Collection #721' },
    erc721_sepolia: { count: 1, chainId: 11155111 as const, name: 'NFT Collection #721' },
  },
}

// 鏈名稱對照
const CHAIN_NAMES: Record<number, string> = {
  11155111: 'Sepolia',
  84532: 'Base Sepolia',
  11155420: 'OP Sepolia',
}

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const

export default function WalletNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { address, isConnected, chain } = useAccount()
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const { data: ethBalance } = useBalance({
    address: address,
    query: {
      enabled: !!address,
      refetchInterval: 10_000,
    },
  })
  
  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      alert('地址已複製！')
    }
  }

  return (
    <>
      {/* 導航欄按鈕組 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ConnectButton />
        {isConnected && (
          <button
            onClick={() => setIsOpen(true)}
            className="btn btn-circle btn-sm"
            title="我的錢包"
            style={{ background: 'linear-gradient(180deg, #131920, #12171d)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </button>
        )}
      </div>

      {/* 側邊欄 Modal */}
      {mounted && isOpen && isConnected && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'start', justifyContent: 'flex-end' }}>
          {/* 背景遮罩 */}
          <div 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(0, 0, 0, 0.6)', 
              backdropFilter: 'blur(4px)' 
            }}
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* 側邊欄內容 */}
          <div 
            className="animate-slide-in"
            style={{ 
              position: 'relative', 
              width: '100%', 
              maxWidth: '480px', 
              height: '100%', 
              background: 'linear-gradient(180deg, #11161c, #0f1319)', 
              boxShadow: '0 20px 60px rgba(0, 0, 0, .8)',
              overflowY: 'auto',
              border: '1px solid var(--line)',
              borderRight: 'none'
            }}
          >
            {/* 標題列 */}
            <div style={{ 
              background: 'linear-gradient(180deg, #0f141a, #0d1117)', 
              padding: '20px', 
              borderBottom: '1px solid var(--line)',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--text)' }}>
                  我的錢包
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="btn btn-circle btn-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 內容區 */}
            <div style={{ padding: '20px' }}>
              {/* 錢包地址卡片 */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div className="sub" style={{ marginBottom: '8px' }}>錢包地址</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    flex: 1, 
                    fontFamily: 'monospace', 
                    fontSize: '14px', 
                    background: '#0f141a', 
                    padding: '10px', 
                    borderRadius: '8px',
                    border: '1px solid var(--line)'
                  }}>
                    {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : ''}
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="btn btn-sm"
                    title="複製地址"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <div className="sub" style={{ marginTop: '8px' }}>
                  <span className="pill">{chain?.name || '未知網路'}</span>
                </div>
              </div>

              {/* ETH 餘額 */}
              <div style={{ marginBottom: '20px' }}>
                <h3 className="sub" style={{ marginBottom: '12px', fontWeight: '600' }}>主要資產</h3>
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, var(--gold), var(--gold-2))', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: '700'
                      }}>
                        Ξ
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '16px' }}>Ethereum</div>
                        <div className="sub">ETH</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {ethBalance ? (
                        <>
                          <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'monospace' }}>
                            {parseFloat(formatEther(ethBalance.value)).toFixed(4)}
                          </div>
                          <div className="sub">ETH</div>
                        </>
                      ) : (
                        <div className="loading"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* AA 錢包 - USDT 多鏈餘額 */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 className="sub" style={{ fontWeight: '600' }}>AA 錢包資產</h3>
                  <span className="pill" style={{ background: 'var(--gold-dim)', color: 'var(--gold-2)' }}>
                    多鏈
                  </span>
                </div>
                
                {/* USDT 總覽 */}
                <div className="card" style={{ marginBottom: '12px', background: '#0f141a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                        color: '#fff'
                      }}>
                        ₮
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '16px' }}>USDT</div>
                        <div className="sub" style={{ fontSize: '11px' }}>Tether USD</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'monospace' }}>
                        {(parseFloat(AA_WALLET_BALANCES.usdt.sepolia.balance) + 
                          parseFloat(AA_WALLET_BALANCES.usdt.baseSepolia.balance) + 
                          parseFloat(AA_WALLET_BALANCES.usdt.opSepolia.balance)).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="sub" style={{ fontSize: '11px' }}>總額</div>
                    </div>
                  </div>
                  
                  <div className="divider"></div>
                  
                  {/* 各鏈餘額 */}
                  <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                    {Object.entries(AA_WALLET_BALANCES.usdt).map(([key, data]) => (
                      <div key={key} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px',
                        background: '#12171d',
                        borderRadius: '8px',
                        border: '1px solid var(--line)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--gold)'
                          }}></div>
                          <span className="sub" style={{ fontSize: '12px' }}>
                            {CHAIN_NAMES[data.chainId]}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '600' }}>
                          {parseFloat(data.balance).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NFT 總覽 */}
                <div className="card" style={{ background: '#0f141a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #667eea, #764ba2)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#fff'
                      }}>
                        🖼
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '16px' }}>NFT</div>
                        <div className="sub" style={{ fontSize: '11px' }}>多鏈收藏</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'monospace' }}>
                        {Object.values(AA_WALLET_BALANCES.nft).reduce((sum, nft) => sum + nft.count, 0)}
                      </div>
                      <div className="sub" style={{ fontSize: '11px' }}>總數</div>
                    </div>
                  </div>
                  
                  <div className="divider"></div>
                  
                  {/* 各 NFT */}
                  <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                    {Object.entries(AA_WALLET_BALANCES.nft).map(([key, data]) => (
                      <div key={key} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px',
                        background: '#12171d',
                        borderRadius: '8px',
                        border: '1px solid var(--line)'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                            {data.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--warning)'
                            }}></div>
                            <span className="sub" style={{ fontSize: '11px' }}>
                              {CHAIN_NAMES[data.chainId]}
                            </span>
                            <span className="chip" style={{ 
                              fontSize: '10px', 
                              padding: '2px 6px',
                              background: 'var(--warning-dim)',
                              color: 'var(--warning)'
                            }}>
                              {key.includes('1155') ? 'ERC-1155' : 'ERC-721'}
                            </span>
                          </div>
                        </div>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '16px', 
                          fontWeight: '700',
                          color: 'var(--warning)'
                        }}>
                          ×{data.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 連接管理 */}
              {/* <div style={{ 
                paddingTop: '20px', 
                paddingBottom: '20px',
                borderTop: '1px solid var(--line)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{ width: '100%', maxWidth: '300px' }}>
                  <ConnectButton showBalance={false} />
                </div>
              </div> */}
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* 樣式覆蓋 */}
      <style jsx global>{`
        .animate-slide-in [data-rk] button {
          width: 100% !important;
          justify-content: center !important;
        }
        
        .animate-slide-in [data-rk] > div {
          width: 100% !important;
        }
      `}</style>
    </>
  )
}
