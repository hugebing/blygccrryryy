/**
 * AssetSelector - 資產選擇器（付款人端）
 * 顯示可選擇的資產與鏈，供付款人配置付款金額
 */

'use client'

import { useState, useEffect } from 'react'
import ChainBadge from '../shared/ChainBadge'
import AmountDisplay from '../shared/AmountDisplay'
import { SUPPORTED_CHAINS } from '../../constants/chains'
import type { AssetRule, ChainId } from '../../types'

// AA 錢包餘額（模擬數據）
// 格式說明：
// - USDT: chainId -> 餘額
// - NFT: 'chainId_type_contractAddress_tokenId' -> 數量
const AA_WALLET_BALANCES = {
  usdt: {
    11155111: '150',      // Sepolia
    84532: '300',           // Base Sepolia
    11155420: '400',       // OP Sepolia
  },
  nft: {
    // ERC721 - 每個 NFT 都是唯一的（數量固定為 1）
    '84532_721_0x7E64D70D8FE71943987cC8BB7F7e2AEBA67bc3f1_5678': 1,
    '11155111_721_0xCeE4D76e247482F6CFfd78b007646e5A3725ed9D_1234': 1,
    
    // ERC1155 - 同一合約可以有多個 token ID，每個 ID 可以有多個數量
    // OP Sepolia - 0x7E64D70D8FE71943987cC8BB7F7e2AEBA67bc3f1
    '11155420_1155_0x7E64D70D8FE71943987cC8BB7F7e2AEBA67bc3f1_2002': 5,  // Token #2002: 5 個
    '11155420_1155_0x7E64D70D8FE71943987cC8BB7F7e2AEBA67bc3f1_3001': 12, // Token #3001: 12 個
  }
}

// 鏈金額配置
interface ChainAllocation {
  chainId: ChainId
  amount: string
}

// 資產配置
interface AssetAllocation {
  assetSymbol: string
  assetDecimals: number
  totalRequired: string
  chains: ChainAllocation[]
}

interface AssetSelectorProps {
  assetRules: AssetRule[]
  onSelectionChange?: (selections: AssetAllocation[]) => void
  onValidationChange?: (isValid: boolean) => void
}

export default function AssetSelector({ 
  assetRules, 
  onSelectionChange,
  onValidationChange 
}: AssetSelectorProps) {
  const [expandedAsset, setExpandedAsset] = useState<string | null>(
    assetRules.length > 0 ? assetRules[0].asset.symbol : null
  )
  
  // 格式化金額顯示（避免顯示過多無意義的小數位）
  const formatAmount = (amount: number | string): string => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    
    // 如果金額大於等於 1，最多顯示 2 位小數
    if (value >= 1) {
      return value.toFixed(2)
    }
    // 如果金額小於 1 但大於 0.01，最多顯示 4 位小數
    if (value >= 0.01) {
      return value.toFixed(4)
    }
    // 如果金額非常小但不為 0，顯示為 0.00
    if (value > 0) {
      return '0.00'
    }
    // 如果為 0，顯示為 0.00
    return '0.00'
  }
  
  // 獲取 AA 錢包在指定鏈上的餘額
  // 對於 ERC1155，需要根據 chainId + contractAddress + tokenId 來查詢特定 token 的數量
  const getAABalance = (rule: AssetRule, chainId: ChainId): string | number => {
    if (rule.asset.type === 'ERC20' && rule.asset.symbol === 'USDT') {
      return AA_WALLET_BALANCES.usdt[chainId] || '0'
    } else if (rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') {
      // NFT 餘額查詢：需要完整匹配 chainId + type + contractAddress + tokenId
      const nftType = rule.asset.type === 'ERC721' ? '721' : '1155'
      const key = `${chainId}_${nftType}_${rule.asset.address}_${rule.asset.tokenId}`
      const balance = AA_WALLET_BALANCES.nft[key as keyof typeof AA_WALLET_BALANCES.nft]
      return balance !== undefined ? balance : 0
    }
    return '0'
  }
  
  // 計算智能分配結果的輔助函數
  const calculateSmartDistribution = (rule: AssetRule): AssetAllocation => {
    // NFT 的處理邏輯
    if (rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') {
      return {
        assetSymbol: rule.asset.symbol,
        assetDecimals: 0,
        totalRequired: rule.totalRequired,
        chains: [
          {
            chainId: rule.chainLimits[0].chainId,
            amount: rule.totalRequired,
          }
        ],
      }
    }
    
    // ERC20 的智能分配邏輯
      const totalRequired = parseFloat(rule.totalRequired)
    
    // 獲取所有可用鏈及其餘額，按餘額從高到低排序
    const availableChains = rule.chainLimits
      .map(limit => ({
        chainId: limit.chainId,
        balance: parseFloat(getAABalance(rule, limit.chainId).toString()),
        vaultAddress: limit.vaultAddress
      }))
      .filter(chain => chain.balance > 0) // 只選擇有餘額的鏈
      .sort((a, b) => b.balance - a.balance) // 按餘額降序排列
    
    if (availableChains.length === 0) {
      // 沒有可用餘額，返回空配置
      return {
        assetSymbol: rule.asset.symbol,
        assetDecimals: rule.asset.decimals || 6,
        totalRequired: rule.totalRequired,
        chains: [],
      }
    }
    
    // 智能分配演算法：優先使用餘額多的鏈
    const allocatedChains: { chainId: ChainId; amount: string }[] = []
    let remaining = totalRequired
    
    for (let i = 0; i < availableChains.length && remaining > 0.000001; i++) {
      const chain = availableChains[i]
      const allocateAmount = Math.min(chain.balance, remaining)
      
      if (allocateAmount > 0.000001) {
        allocatedChains.push({
          chainId: chain.chainId,
          amount: formatAmount(allocateAmount)
        })
        remaining -= allocateAmount
      }
    }
    
    return {
      assetSymbol: rule.asset.symbol,
      assetDecimals: rule.asset.decimals || 6,
      totalRequired: rule.totalRequired,
      chains: allocatedChains,
    }
  }
  
  // 每個資產的配置狀態（預設使用推薦模式）
  const [allocations, setAllocations] = useState<AssetAllocation[]>(() => 
    assetRules.map(rule => calculateSmartDistribution(rule))
  )
  
  // 初始化分配模式（預設為 smart）
  const [initialDistributionMode] = useState<Record<number, 'manual' | 'smart'>>(() => {
    const modes: Record<number, 'manual' | 'smart'> = {}
    assetRules.forEach((rule, index) => {
      // ERC20 預設使用智能推薦模式，NFT 不需要模式
      if (rule.asset.type === 'ERC20') {
        modes[index] = 'smart'
      }
    })
    return modes
  })
  
  // 追蹤每個資產的分配方式：'manual' | 'smart'
  const [distributionMode, setDistributionMode] = useState<Record<number, 'manual' | 'smart'>>(initialDistributionMode)
  
  // 當配置改變時，通知父組件
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(allocations)
    }
    
    // 驗證所有資產是否都達標
    if (onValidationChange) {
      const isValid = allocations.every((alloc, index) => {
        const rule = assetRules[index]
        const totalAllocated = alloc.chains.reduce((sum, chain) => {
          return sum + parseFloat(chain.amount || '0')
        }, 0)
        const required = parseFloat(rule.totalRequired)
        return Math.abs(totalAllocated - required) < 0.000001 // 浮點數精度容差
      })
      onValidationChange(isValid)
    }
  }, [allocations, assetRules, onSelectionChange, onValidationChange])
  
  // 切換鏈選擇
  const handleToggleChain = (assetIndex: number, chainId: ChainId) => {
    setAllocations(prev => {
      const newAllocations = [...prev]
      const alloc = { ...newAllocations[assetIndex] } // 創建 alloc 的副本
      const existingIndex = alloc.chains.findIndex(c => c.chainId === chainId)
      
      if (existingIndex >= 0) {
        // 移除鏈 - 創建新數組而不是直接修改
        alloc.chains = alloc.chains.filter(c => c.chainId !== chainId)
      } else {
        // 新增鏈 - 創建新數組
        alloc.chains = [...alloc.chains, { chainId, amount: '0' }]
      }
      
      newAllocations[assetIndex] = alloc
      return newAllocations
    })
    
    // 手動選擇鏈，設為手動模式
    setDistributionMode(prev => ({ ...prev, [assetIndex]: 'manual' }))
  }
  
  // 更新鏈金額
  const handleAmountChange = (assetIndex: number, chainId: ChainId, amount: string) => {
    setAllocations(prev => {
      const newAllocations = [...prev]
      const alloc = { ...newAllocations[assetIndex] } // 創建 alloc 的副本
      
      // 創建新的 chains 數組，更新指定鏈的金額
      alloc.chains = alloc.chains.map(chain => 
        chain.chainId === chainId 
          ? { ...chain, amount } 
          : chain
      )
      
      newAllocations[assetIndex] = alloc
      return newAllocations
    })
    
    // 手動修改金額，設為手動模式
    setDistributionMode(prev => ({ ...prev, [assetIndex]: 'manual' }))
  }
  
  // 智能分配：根據各鏈餘額推薦最佳分配方案
  const handleSmartDistribute = (assetIndex: number) => {
    const rule = assetRules[assetIndex]
    
    // 只對 ERC20 進行智能分配
    if (rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') {
      return
    }
    
    setAllocations(prev => {
      const newAllocations = [...prev]
      const alloc = { ...newAllocations[assetIndex] }
      
      const totalRequired = parseFloat(alloc.totalRequired)
      
      // 獲取所有可用鏈及其餘額，按餘額從高到低排序
      const availableChains = rule.chainLimits
        .map(limit => ({
          chainId: limit.chainId,
          balance: parseFloat(getAABalance(rule, limit.chainId).toString()),
          vaultAddress: limit.vaultAddress
        }))
        .filter(chain => chain.balance > 0) // 只選擇有餘額的鏈
        .sort((a, b) => b.balance - a.balance) // 按餘額降序排列
      
      if (availableChains.length === 0) {
        // 沒有可用餘額
        alloc.chains = []
        newAllocations[assetIndex] = alloc
        return newAllocations
      }
      
      // 智能分配演算法：優先使用餘額多的鏈
      const allocatedChains: { chainId: ChainId; amount: string }[] = []
      let remaining = totalRequired
      
      for (let i = 0; i < availableChains.length && remaining > 0.000001; i++) {
        const chain = availableChains[i]
        const allocateAmount = Math.min(chain.balance, remaining)
        
        if (allocateAmount > 0.000001) {
          allocatedChains.push({
            chainId: chain.chainId,
            amount: formatAmount(allocateAmount)
          })
          remaining -= allocateAmount
        }
      }
      
      // 如果餘額不足，顯示警告但仍然分配
      if (remaining > 0.000001) {
        console.warn(`餘額不足！還需要 ${formatAmount(remaining)} ${rule.asset.symbol}`)
      }
      
      alloc.chains = allocatedChains
      newAllocations[assetIndex] = alloc
      return newAllocations
    })
    
    // 設為智能分配模式
    setDistributionMode(prev => ({ ...prev, [assetIndex]: 'smart' }))
  }
  
  // 計算已分配總額
  const getTotalAllocated = (assetIndex: number) => {
    const alloc = allocations[assetIndex]
    return alloc.chains.reduce((sum, chain) => {
      return sum + parseFloat(chain.amount || '0')
    }, 0)
  }
  
  // 檢查是否達標
  const isAssetFulfilled = (assetIndex: number) => {
    const rule = assetRules[assetIndex]
    const totalAllocated = getTotalAllocated(assetIndex)
    const required = parseFloat(rule.totalRequired)
    return Math.abs(totalAllocated - required) < 0.000001
  }
  
  return (
    <div className="card">
      <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
        配置付款方式
      </h3>
      <p className="sub" style={{ marginBottom: '16px' }}>
        選擇要使用的鏈並分配金額，總計需符合帳單要求
      </p>
      
      <div className="divider"></div>
      
      {/* 資產列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {assetRules.map((rule, assetIndex) => {
          const alloc = allocations[assetIndex]
          const totalAllocated = getTotalAllocated(assetIndex)
          const required = parseFloat(rule.totalRequired)
          const isFulfilled = isAssetFulfilled(assetIndex)
          const isExpanded = expandedAsset === rule.asset.symbol
          
          return (
            <div 
              key={rule.asset.symbol}
              className="card"
              style={{ 
                background: 'var(--panel)',
                border: isFulfilled ? '2px solid var(--success)' : '1px solid var(--line)'
              }}
            >
              {/* 資產標題 */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedAsset(isExpanded ? null : rule.asset.symbol)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {/* NFT 圖標 */}
                    {(rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') && (
                      <span style={{ fontSize: '24px' }}>🖼</span>
                    )}
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '700' }}>
                        {rule.asset.collectionName || rule.asset.name}
                      </div>
                      {rule.asset.tokenId && (
                        <div className="sub" style={{ fontSize: '11px' }}>
                          Token ID: {rule.asset.tokenId}
                        </div>
                      )}
                    </div>
                    {isFulfilled && (
                      <span className="pill" style={{ background: 'var(--success-dim)', color: 'var(--success)' }}>
                        ✅ 已達標
                      </span>
                    )}
                    <span className="chip" style={{ 
                      fontSize: '10px', 
                      padding: '2px 6px',
                      background: 'var(--warning-dim)',
                      color: 'var(--warning)'
                    }}>
                      {rule.asset.type}
                    </span>
                  </div>
                  <div className="sub" style={{ fontSize: '12px' }}>
                    {(rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') ? (
                      <>需求數量: {rule.totalRequired} 個</>
                    ) : (
                      <>需求: <AmountDisplay value={rule.totalRequired} decimals={rule.asset.decimals} symbol={rule.asset.symbol} /></>
                    )}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  {(rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') ? (
                    <>
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: '700', 
                        fontFamily: 'monospace',
                        color: isFulfilled ? 'var(--success)' : 'var(--warning)'
                      }}>
                        ×{Math.floor(totalAllocated)}
                      </div>
                      <div className="sub" style={{ fontSize: '11px' }}>
                        已選擇
                      </div>
                    </>
                  ) : (
                    <>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '700', 
                    fontFamily: 'monospace',
                    color: isFulfilled ? 'var(--success)' : totalAllocated > required ? 'var(--error)' : 'var(--warning)'
                  }}>
                        {formatAmount(totalAllocated)}
                  </div>
                  <div className="sub" style={{ fontSize: '11px' }}>
                    已分配
                  </div>
                    </>
                  )}
                </div>
                
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  style={{ 
                    width: '20px', 
                    height: '20px',
                    marginLeft: '12px',
                    transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                  }} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {/* 展開的鏈配置 */}
              {isExpanded && (
                <div onClick={(e) => e.stopPropagation()}>
                  <div className="divider" style={{ margin: '16px 0' }}></div>
                  
                  {/* NFT 特殊說明 */}
                  {(rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') && (
                    <div 
                      className="card"
                      style={{ 
                        padding: '12px',
                        background: 'var(--warning-dim)',
                        border: '1px solid var(--warning)',
                        marginBottom: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>ℹ️</span>
                        <span className="sub" style={{ color: 'var(--warning)', fontSize: '12px' }}>
                          NFT 資產只需選擇一條鏈進行轉移，數量固定為 {rule.totalRequired} 個
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* 可用鏈列表 */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="sub" style={{ fontWeight: '600', lineHeight: '32px' }}>
                        {(rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') 
                          ? `選擇鏈（單選）` 
                          : `選擇鏈 (${alloc.chains.length} / ${rule.chainLimits.length})`
                        }
                      </span>
                      {!(rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') && (
                        <button
                          className={`btn btn-sm ${distributionMode[assetIndex] === 'smart' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSmartDistribute(assetIndex)
                          }}
                          style={{ 
                            fontSize: '11px', 
                            whiteSpace: 'nowrap',
                            padding: '4px 10px',
                            minWidth: 'fit-content',
                            height: '32px'
                          }}
                        >
                          ✨ 推薦
                        </button>
                      )}
                    </div>
                    
                    <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                      {rule.chainLimits.map((limit) => {
                        const isSelected = alloc.chains.some(c => c.chainId === limit.chainId)
                        const chain = SUPPORTED_CHAINS[limit.chainId]
                        
                        return (
                          <button
                            key={limit.chainId}
                            className={`chip toggle ${isSelected ? 'sel' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              // NFT 只能選擇一條鏈
                              if (rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') {
                                setAllocations(prev => {
                                  const newAllocations = [...prev]
                                  newAllocations[assetIndex].chains = [
                                    { chainId: limit.chainId, amount: rule.totalRequired }
                                  ]
                                  return newAllocations
                                })
                              } else {
                              handleToggleChain(assetIndex, limit.chainId)
                              }
                            }}
                            style={{ fontSize: '13px', padding: '8px 16px' }}
                          >
                            {chain?.name || `Chain ${limit.chainId}`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* 金額輸入（僅 ERC20） */}
                  {alloc.chains.length > 0 && !(rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') && (
                    <div>
                      <span className="sub" style={{ fontWeight: '600', display: 'block', marginBottom: '12px' }}>
                        分配金額
                      </span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {alloc.chains.map((chainAlloc) => {
                          const limit = rule.chainLimits.find(l => l.chainId === chainAlloc.chainId)
                          const chain = SUPPORTED_CHAINS[chainAlloc.chainId]
                          const balance = getAABalance(rule, chainAlloc.chainId)
                          const balanceNum = parseFloat(balance.toString())
                          const inputNum = parseFloat(chainAlloc.amount || '0')
                          const isInsufficient = inputNum > balanceNum
                          
                          return (
                            <div 
                              key={chainAlloc.chainId}
                              className="card"
                              style={{ 
                                padding: '12px',
                                background: 'var(--bg)',
                                border: isInsufficient ? '1px solid var(--error)' : '1px solid var(--line)'
                              }}
                            >
                              {/* 餘額顯示 */}
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '8px'
                              }}>
                                <ChainBadge chainId={chainAlloc.chainId} showName={true} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span className="sub" style={{ fontSize: '11px' }}>
                                    AA 錢包餘額:
                                  </span>
                                  <span style={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: '12px', 
                                    fontWeight: '600',
                                    color: 'var(--gold)'
                                  }}>
                                    {formatAmount(balance.toString())}
                                  </span>
                                  <span className="sub" style={{ fontSize: '11px' }}>
                                    {rule.asset.symbol}
                                  </span>
                                </div>
                              </div>
                              
                              {/* 金額輸入 */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                  type="number"
                                  step="0.000001"
                                  min="0"
                                  max={balance.toString()}
                                  value={chainAlloc.amount}
                                  onChange={(e) => handleAmountChange(assetIndex, chainAlloc.chainId, e.target.value)}
                                  placeholder="0.00"
                                  style={{ 
                                    flex: 1,
                                    fontFamily: 'monospace',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    borderColor: isInsufficient ? 'var(--error)' : undefined
                                  }}
                                />
                                
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleAmountChange(assetIndex, chainAlloc.chainId, balance.toString())}
                                  style={{ fontSize: '11px', padding: '4px 8px', whiteSpace: 'nowrap' }}
                                >
                                  最大
                                </button>
                                
                                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--muted)' }}>
                                  {rule.asset.symbol}
                                </span>
                              </div>
                              
                              {/* 餘額不足警告 */}
                              {isInsufficient && (
                                <div style={{ 
                                  marginTop: '8px',
                                  padding: '6px 8px',
                                  background: 'var(--error-dim)',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px', color: 'var(--error)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <span style={{ fontSize: '11px', color: 'var(--error)' }}>
                                    餘額不足！可用: {formatAmount(balance.toString())} {rule.asset.symbol}
                                  </span>
                                </div>
                                )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* NFT 已選擇確認 */}
                  {alloc.chains.length > 0 && (rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') && (() => {
                    const balance = getAABalance(rule, alloc.chains[0].chainId)
                    const balanceNum = typeof balance === 'number' ? balance : parseInt(balance)
                    const requiredNum = parseInt(rule.totalRequired)
                    const isInsufficient = requiredNum > balanceNum
                    
                    return (
                      <div 
                        className="card"
                        style={{ 
                          padding: '16px',
                          background: isInsufficient ? 'var(--error-dim)' : 'var(--success-dim)',
                          border: isInsufficient ? '1px solid var(--error)' : '1px solid var(--success)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* 鏈選擇與餘額 */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <ChainBadge chainId={alloc.chains[0].chainId} showName={true} />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              {rule.asset.tokenId && (
                                <div className="sub" style={{ fontSize: '10px' }}>
                                  Token #{rule.asset.tokenId}
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="sub" style={{ fontSize: '11px' }}>
                                  AA 錢包{rule.asset.type === 'ERC1155' ? '此 Token ' : ''}持有:
                                </span>
                                <span style={{ 
                                  fontFamily: 'monospace', 
                                  fontSize: '12px', 
                                  fontWeight: '700',
                                  color: isInsufficient ? 'var(--error)' : 'var(--gold)'
                                }}>
                                  ×{balanceNum}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 狀態提示 */}
                          <div style={{ 
                            textAlign: 'center',
                            fontSize: '14px',
                            fontWeight: '700',
                            color: isInsufficient ? 'var(--error)' : 'var(--success)'
                          }}>
                            {isInsufficient ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <span>
                                    {rule.asset.type === 'ERC1155' ? 'Token ' : ''}數量不足！
                                  </span>
                                </div>
                                <span style={{ fontSize: '12px' }}>
                                  需要 ×{requiredNum}，{rule.asset.type === 'ERC1155' ? '此 Token ' : ''}持有 ×{balanceNum}
                                </span>
                              </div>
                            ) : (
                              <span>✓ 已選擇此鏈進行 NFT 轉移</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                  
                  {alloc.chains.length === 0 && (
                    <div 
                      className="card"
                      style={{ 
                        padding: '20px',
                        background: 'var(--info-dim)',
                        border: '1px solid var(--info)',
                        textAlign: 'center'
                      }}
                    >
                      <span className="sub" style={{ color: 'var(--info)' }}>
                        👆 請先選擇要使用的鏈
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

