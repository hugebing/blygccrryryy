/**
 * RuleBuilder - 資產規則建構器
 * 選擇資產、設定每鏈金額（總和需等於總金額）
 */

'use client'

import { useState } from 'react'
import ChainBadge from '../shared/ChainBadge'
import { SUPPORTED_CHAINS } from '../../constants/chains'
import type { AssetRule, Asset, ChainLimit, ChainId } from '../../types'

interface RuleBuilderProps {
  assetRules: AssetRule[]
  onChange: (rules: AssetRule[]) => void
}

// 預設資產模板
// 測試網 USDT 合約地址
const USDT_ADDRESSES: Record<ChainId, `0x${string}`> = {
  11155111: '0x71549C631F6E3a506D2B19f7DEF17E788C9C04f6', // Sepolia
  84532: '0x69fd0513C9EDDD4bCE675D759509f3EafC5A4b42',    // Base Sepolia
  11155420: '0x69fd0513C9EDDD4bCE675D759509f3EafC5A4b42', // OP Sepolia
}

const ASSET_TEMPLATES: Asset[] = [
  {
    type: 'ERC20',
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x71549C631F6E3a506D2B19f7DEF17E788C9C04f6', // 默認 Sepolia
    decimals: 6,
    chainId: 11155111,
  },
  {
    type: 'ERC721',
    symbol: 'NFT',
    name: 'NFT Collection',
    chainId: 11155111,
  },
]

// 支援的鏈（每種資產可能不同）
const SUPPORTED_CHAINS_BY_ASSET: Record<string, ChainId[]> = {
  USDT: [11155111, 84532, 11155420], // Sepolia, Base Sepolia, OP Sepolia
  NFT: [11155111, 84532, 11155420],
  'PROPERTY': [11155420], // 房產代幣只在 OP Sepolia
  'TNFT': [84532], // TNFT 只在 Base Sepolia
}

// 房產代幣合約地址（OP Sepolia ERC1155）
const PROPERTY_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_NFT15_OP_Sepolia as `0x${string}` || '0x7E64D70D8FE71943987cC8BB7F7e2AEBA67bc3f1'
const PROPERTY_TOKEN_ID = '11'
const PROPERTY_TOKEN_AMOUNT = '100'

// TNFT 合約地址（Base Sepolia ERC721）
const TNFT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_NFT21_Base_Sepolia as `0x${string}` || '0x69fd0513C9EDDD4bCE675D759509f3EafC5A4b42'
const TNFT_TOKEN_ID = '11'

export default function RuleBuilder({
  assetRules,
  onChange,
}: RuleBuilderProps) {
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null)
  const [showNFTConfig, setShowNFTConfig] = useState(false)
  const [nftConfig, setNftConfig] = useState({
    nftType: 'ERC721' as 'ERC721' | 'ERC1155',
    chainId: 11155111 as ChainId, // 默認 Sepolia
    collectionAddress: '',
    collectionName: '',
    tokenId: '',
    amount: '1', // ERC1155 的數量
  })
  
  // 新增資產規則
  const handleAddAsset = (asset: Asset) => {
    // 如果是 NFT，顯示配置界面
    if (asset.type === 'ERC721') {
      setShowNFTConfig(true)
      return
    }
    
    const supportedChains = SUPPORTED_CHAINS_BY_ASSET[asset.symbol] || [1]
    
    const newRule: AssetRule = {
      asset,
      totalRequired: '0',
      chainLimits: supportedChains.map(chainId => ({
        chainId,
        vaultAddress: `0x${'0'.repeat(40)}` as `0x${string}`,
      })),
    }
    
    onChange([...assetRules, newRule])
    setExpandedAsset(asset.symbol)
  }
  
  // 確認 NFT 配置
  const handleConfirmNFT = () => {
    if (!nftConfig.collectionAddress || !nftConfig.tokenId) {
      alert('請填寫 NFT Collection 地址和 Token ID')
      return
    }
    
    if (nftConfig.nftType === 'ERC1155' && (!nftConfig.amount || parseFloat(nftConfig.amount) <= 0)) {
      alert('請填寫 ERC1155 的數量')
      return
    }
    
    const nftAsset: Asset = {
      type: nftConfig.nftType,
      symbol: nftConfig.nftType === 'ERC721' ? 'NFT-721' : 'NFT-1155',
      name: nftConfig.collectionName || nftConfig.nftType,
      chainId: nftConfig.chainId,
      address: nftConfig.collectionAddress as `0x${string}`,
      tokenId: nftConfig.tokenId,
      collectionName: nftConfig.collectionName,
    }
    
    const newRule: AssetRule = {
      asset: nftAsset,
      totalRequired: nftConfig.nftType === 'ERC721' ? '1' : nftConfig.amount,
      chainLimits: [{
        chainId: nftConfig.chainId,
        vaultAddress: `0x${'0'.repeat(40)}` as `0x${string}`,
      }],
    }
    
    onChange([...assetRules, newRule])
    setExpandedAsset('NFT')
    setShowNFTConfig(false)
    // 重置配置
    setNftConfig({
      nftType: 'ERC721',
      chainId: 11155111, // 默認 Sepolia
      collectionAddress: '',
      collectionName: '',
      tokenId: '',
      amount: '1',
    })
  }
  
  // 直接添加房產代幣（預設配置）
  const handleAddPropertyToken = () => {
    const propertyAsset: Asset = {
      type: 'ERC1155',
      symbol: 'PROPERTY',
      name: '房產代幣',
      chainId: 11155420, // OP Sepolia
      address: PROPERTY_TOKEN_ADDRESS,
      tokenId: PROPERTY_TOKEN_ID,
      collectionName: '房產代幣',
    }
    
    const newRule: AssetRule = {
      asset: propertyAsset,
      totalRequired: PROPERTY_TOKEN_AMOUNT,
      chainLimits: [{
        chainId: 11155420, // OP Sepolia
        vaultAddress: `0x${'0'.repeat(40)}` as `0x${string}`,
      }],
    }
    
    onChange([...assetRules, newRule])
    setExpandedAsset(propertyAsset.symbol)
  }
  
  // 直接添加 TNFT（預設配置）
  const handleAddTNFT = () => {
    const tnftAsset: Asset = {
      type: 'ERC721',
      symbol: 'TNFT',
      name: 'TNFT',
      chainId: 84532, // Base Sepolia
      address: TNFT_TOKEN_ADDRESS,
      tokenId: TNFT_TOKEN_ID,
      collectionName: 'TNFT',
    }
    
    const newRule: AssetRule = {
      asset: tnftAsset,
      totalRequired: '1', // ERC721 固定為 1
      chainLimits: [{
        chainId: 84532, // Base Sepolia
        vaultAddress: `0x${'0'.repeat(40)}` as `0x${string}`,
      }],
    }
    
    onChange([...assetRules, newRule])
    setExpandedAsset(tnftAsset.symbol)
  }
  
  // 移除資產規則
  const handleRemoveAsset = (index: number) => {
    const newRules = assetRules.filter((_, i) => i !== index)
    onChange(newRules)
  }
  
  // 更新總需求金額
  const handleUpdateTotalRequired = (index: number, value: string) => {
    const newRules = [...assetRules]
    newRules[index].totalRequired = value
    onChange(newRules)
  }
  
  // 切換鏈啟用狀態
  const handleToggleChain = (ruleIndex: number, chainId: ChainId) => {
    const newRules = [...assetRules]
    const rule = newRules[ruleIndex]
    
    const existingIndex = rule.chainLimits.findIndex(limit => limit.chainId === chainId)
    
    if (existingIndex >= 0) {
      // 移除鏈
      rule.chainLimits.splice(existingIndex, 1)
    } else {
      // 新增鏈
      rule.chainLimits.push({
        chainId,
        vaultAddress: `0x${'0'.repeat(40)}` as `0x${string}`,
      })
    }
    
    onChange(newRules)
  }
  
  return (
    <div className="card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
          多鏈資產
        </h3>
        <span className="pill">
          {assetRules.length} 種資產
        </span>
      </div>
      
      {/* 已選擇的資產 */}
      {assetRules.map((rule, ruleIndex) => {
        const isExpanded = expandedAsset === rule.asset.symbol
        const supportedChains = SUPPORTED_CHAINS_BY_ASSET[rule.asset.symbol] || [1]
        
        return (
          <div key={ruleIndex} style={{ marginBottom: '16px', position: 'relative' }}>
            {/* 刪除按鈕 - 右上角 */}
            <button
              className="btn btn-circle btn-sm"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveAsset(ruleIndex)
              }}
              style={{ 
                position: 'absolute',
                top: '20px',
                right: '12px',
                zIndex: 10,
                background: 'var(--error-dim)', 
                borderColor: 'var(--error)' 
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* 資產卡片 */}
            <div
              className={`li ${isExpanded ? 'active' : ''}`}
              onClick={() => setExpandedAsset(isExpanded ? null : rule.asset.symbol)}
              style={{ 
                cursor: 'pointer',
                flexWrap: 'wrap',
                gap: '12px',
                paddingRight: '48px' // 給右上角的 X 按鈕留出空間
              }}
            >
              <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
                <div className="row" style={{ marginBottom: '4px' }}>
                  <span className="chip">{rule.asset.type}</span>
                  <b style={{ fontSize: '16px' }}>{rule.asset.symbol}</b>
                </div>
                {(rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') ? (
                  <div>
                    <div className="sub" style={{ fontSize: '12px' }}>
                      {rule.asset.collectionName || rule.asset.name}
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--warning)' }}>
                      Token ID: {rule.asset.tokenId}
                    </div>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--muted)' }}>
                      {rule.asset.address}
                    </div>
                  </div>
                ) : (
                  <span className="sub">{rule.asset.name}</span>
                )}
              </div>
              
              <div className="row" style={{ flex: '0 0 auto', gap: '8px' }}>
                {rule.asset.type === 'ERC721' ? (
                  <span className="pill" style={{ background: 'var(--line)', color: 'var(--muted)' }}>
                    1 個 NFT
                  </span>
                ) : rule.asset.type === 'ERC1155' ? (
                  <div className="row" style={{ gap: '4px', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={rule.totalRequired}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleUpdateTotalRequired(ruleIndex, e.target.value)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="數量"
                      style={{ width: '80px', padding: '8px 12px' }}
                      step="1"
                      min="1"
                    />
                    <span className="pill" style={{ background: 'var(--line)', color: 'var(--muted)' }}>
                      個
                    </span>
                  </div>
                ) : (
                  <input
                    type="number"
                    value={rule.totalRequired}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleUpdateTotalRequired(ruleIndex, e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="總金額"
                    style={{ width: '120px', padding: '8px 12px' }}
                    step="0.01"
                    min="0"
                  />
                )}
                
                <span className="pill">
                  {rule.chainLimits.length} 條鏈
                </span>
              </div>
            </div>
            
            {/* 展開的鏈配置 - 簡化版 */}
            {isExpanded && (
              <div className="card" style={{ background: 'var(--panel)', marginTop: '8px', padding: '16px' }}>
                {(rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155') ? (
                  /* NFT 顯示固定鏈 */
                  <div>
                    <span className="sub" style={{ fontWeight: '600', display: 'block', marginBottom: '12px' }}>
                      NFT 所在鏈
                    </span>
                    <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                      <div className="chip sel" style={{ fontSize: '13px', padding: '8px 16px' }}>
                        {SUPPORTED_CHAINS[rule.asset.chainId]?.name || `Chain ${rule.asset.chainId}`}
                      </div>
                    </div>
                    {/* <div style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      background: 'var(--warning-dim)', 
                      borderRadius: '6px',
                      border: '1px solid var(--warning)'
                    }}>
                      <div className="row" style={{ gap: '6px', alignItems: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="sub" style={{ fontSize: '12px', color: 'var(--warning)' }}>
                          此 NFT 僅存在於 {SUPPORTED_CHAINS[rule.asset.chainId]?.name} 鏈上
                        </span>
                      </div>
                    </div> */}
                  </div>
                ) : (
                  /* 一般資產的鏈選擇 */
                  <div>
                    <span className="sub" style={{ fontWeight: '600', display: 'block', marginBottom: '12px' }}>
                      選擇可接受的鏈
                    </span>
                    
                    <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                      {supportedChains.map((chainId) => {
                        const isSelected = rule.chainLimits.some(limit => limit.chainId === chainId)
                        return (
                          <button
                            key={chainId}
                            className={`chip toggle ${isSelected ? 'sel' : ''}`}
                            onClick={() => handleToggleChain(ruleIndex, chainId)}
                            style={{ fontSize: '13px', padding: '8px 16px' }}
                          >
                            {SUPPORTED_CHAINS[chainId]?.name || `Chain ${chainId}`}
                          </button>
                        )
                      })}
                    </div>
                    
                    {rule.chainLimits.length > 0 && (
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '12px', 
                        background: 'var(--info-dim)', 
                        borderRadius: '6px',
                        border: '1px solid var(--info)'
                      }}>
                        <div className="row" style={{ gap: '6px', alignItems: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', color: 'var(--info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="sub" style={{ fontSize: '12px', color: 'var(--info)' }}>
                            付款人可以從已選鏈中任選搭配，總金額達 <b>{rule.totalRequired} {rule.asset.symbol}</b> 即可
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {/* 新增資產按鈕 */}
      <div className="divider"></div>
      <div>
        <span className="sub" style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>
          新增資產
        </span>
        <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
          {ASSET_TEMPLATES.filter(
            template => {
              // NFT 可以重複添加（不同的 collection/tokenId）
              if (template.type === 'ERC721') return true
              // 其他資產不能重複
              return !assetRules.some(rule => rule.asset.symbol === template.symbol)
            }
          ).map((template) => (
            <button
              key={template.symbol}
              className="chip toggle"
              onClick={() => handleAddAsset(template)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              {template.symbol}
            </button>
          ))}
          
          {/* 即將推出的資產（外觀正常但無功能） */}
          <button
            className="chip toggle"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // 不執行任何操作
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            USDC
          </button>
          
          <button
            className="chip toggle"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // 不執行任何操作
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            RWA
          </button>
          
          {/* 房產代幣（有功能） */}
          <button
            className="chip toggle"
            onClick={handleAddPropertyToken}
            disabled={assetRules.some(rule => rule.asset.symbol === 'PROPERTY')}
            style={{
              opacity: assetRules.some(rule => rule.asset.symbol === 'PROPERTY') ? 0.4 : 1,
              cursor: assetRules.some(rule => rule.asset.symbol === 'PROPERTY') ? 'not-allowed' : 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            房產代幣
          </button>
          
          {/* TNFT（有功能） */}
          <button
            className="chip toggle"
            onClick={handleAddTNFT}
            disabled={assetRules.some(rule => rule.asset.symbol === 'TNFT')}
            style={{
              opacity: assetRules.some(rule => rule.asset.symbol === 'TNFT') ? 0.4 : 1,
              cursor: assetRules.some(rule => rule.asset.symbol === 'TNFT') ? 'not-allowed' : 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            TNFT
          </button>
        </div>
      </div>
      
      {/* NFT 配置界面 */}
      {showNFTConfig && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }} onClick={() => setShowNFTConfig(false)}>
          <div 
            className="card" 
            style={{ 
              maxWidth: '500px', 
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>
                配置 NFT
              </h3>
              <button 
                onClick={() => setShowNFTConfig(false)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="divider"></div>
            
            <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
              {/* NFT 類型選擇 */}
              <div>
                <label className="sub" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  NFT 標準 *
                </label>
                <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className={`chip toggle ${nftConfig.nftType === 'ERC721' ? 'sel' : ''}`}
                    onClick={() => setNftConfig({ ...nftConfig, nftType: 'ERC721', amount: '1' })}
                    style={{ flex: 1 }}
                  >
                    ERC-721
                    
                  </button>
                  <button
                    className={`chip toggle ${nftConfig.nftType === 'ERC1155' ? 'sel' : ''}`}
                    onClick={() => setNftConfig({ ...nftConfig, nftType: 'ERC1155' })}
                    style={{ flex: 1 }}
                  >
                    ERC-1155
                    
                  </button>
                </div>
              </div>
              
              {/* 選擇鏈 */}
              <div>
                <label className="sub" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  選擇鏈 *
                </label>
                <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                  {SUPPORTED_CHAINS_BY_ASSET.NFT.map((chainId) => (
                    <button
                      key={chainId}
                      className={`chip toggle ${nftConfig.chainId === chainId ? 'sel' : ''}`}
                      onClick={() => setNftConfig({ ...nftConfig, chainId })}
                    >
                      <ChainBadge chainId={chainId} showName={true} />
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Collection 地址 */}
              <div>
                <label className="sub" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  NFT Collection 地址 *
                </label>
                <input
                  type="text"
                  value={nftConfig.collectionAddress}
                  onChange={(e) => setNftConfig({ ...nftConfig, collectionAddress: e.target.value })}
                  placeholder="0x..."
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>
              
              {/* Collection 名稱 */}
              <div>
                <label className="sub" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Collection 名稱（選填）
                </label>
                <input
                  type="text"
                  value={nftConfig.collectionName}
                  onChange={(e) => setNftConfig({ ...nftConfig, collectionName: e.target.value })}
                  placeholder="例如：Bored Ape Yacht Club"
                  style={{ width: '100%' }}
                />
              </div>
              
              {/* Token ID */}
              <div>
                <label className="sub" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Token ID *
                </label>
                <input
                  type="text"
                  value={nftConfig.tokenId}
                  onChange={(e) => setNftConfig({ ...nftConfig, tokenId: e.target.value })}
                  placeholder="例如：1234"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>
              
              {/* ERC1155 數量 */}
              {nftConfig.nftType === 'ERC1155' && (
                <div>
                  <label className="sub" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    數量 *
                  </label>
                  <input
                    type="number"
                    value={nftConfig.amount}
                    onChange={(e) => setNftConfig({ ...nftConfig, amount: e.target.value })}
                    placeholder="例如：10"
                    style={{ width: '100%', fontFamily: 'monospace' }}
                    min="1"
                    step="1"
                  />
                  <div className="sub" style={{ fontSize: '11px', marginTop: '4px', color: 'var(--warning)' }}>
                    此 Token ID 需要的 NFT 數量
                  </div>
                </div>
              )}
            </div>
            
            <div className="divider" style={{ margin: '20px 0' }}></div>
            
            <div className="row" style={{ gap: '12px' }}>
              <button
                className="btn"
                onClick={() => setShowNFTConfig(false)}
                style={{ flex: 1 }}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmNFT}
                style={{ flex: 1 }}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

