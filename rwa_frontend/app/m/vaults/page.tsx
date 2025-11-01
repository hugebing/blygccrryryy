/**
 * Vault 管理頁面 - /m/vaults
 * 查看各鏈 Vault 狀態與餘額
 */

'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import MerchantLayout from '../../components/layouts/MerchantLayout'
import LoadingState from '../../components/shared/LoadingState'
import ChainBadge from '../../components/shared/ChainBadge'
import { getVaults } from '../../services/mockData'
import type { VaultInfo } from '../../types'

export default function VaultsPage() {
  const { isConnected } = useAccount()
  const [vaults, setVaults] = useState<VaultInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    loadVaults()
  }, [])
  
  const loadVaults = async () => {
    setIsLoading(true)
    try {
      const data = await getVaults()
      setVaults(data)
    } catch (err) {
      console.error('載入 Vault 失敗：', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 狀態配置
  const getStatusConfig = (status: VaultInfo['status']) => {
    const configs = {
      active: { label: '正常', color: 'var(--success)', icon: '✅' },
      low_balance: { label: '餘額不足', color: 'var(--warning)', icon: '⚠️' },
      paused: { label: '已暫停', color: 'var(--error)', icon: '⏸️' },
    }
    return configs[status]
  }
  
  // 計算總計
  const totals = vaults.reduce((acc, vault) => ({
    balance: acc.balance + parseFloat(vault.balance),
    claimable: acc.claimable + parseFloat(vault.claimable),
    locked: acc.locked + parseFloat(vault.locked),
  }), { balance: 0, claimable: 0, locked: 0 })
  
  return (
    <MerchantLayout>
      <div style={{ marginTop: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>
            Vault 管理
          </h1>
          <p className="muted">多鏈保管箱狀態與餘額監控</p>
        </div>
        
        {/* 總覽卡片 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>總餘額</div>
            <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace' }}>
              {totals.balance.toLocaleString()} <span className="sub" style={{ fontSize: '14px' }}>USDT</span>
            </div>
          </div>
          
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>可領款</div>
            <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--success)' }}>
              {totals.claimable.toLocaleString()} <span className="sub" style={{ fontSize: '14px' }}>USDT</span>
            </div>
          </div>
          
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>鎖定中</div>
            <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--warning)' }}>
              {totals.locked.toLocaleString()} <span className="sub" style={{ fontSize: '14px' }}>USDT</span>
            </div>
          </div>
          
          <div className="card" style={{ background: 'var(--panel)' }}>
            <div className="sub" style={{ marginBottom: '6px' }}>支援鏈數</div>
            <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--info)' }}>
              {vaults.length} <span className="sub" style={{ fontSize: '14px' }}>條鏈</span>
            </div>
          </div>
        </div>
        
        {/* Vault 列表 */}
        {isLoading ? (
          <LoadingState type="skeleton" />
        ) : (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
              各鏈 Vault 詳情
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {vaults.map((vault) => {
                const statusConfig = getStatusConfig(vault.status)
                const balancePercentage = (parseFloat(vault.balance) / totals.balance * 100).toFixed(1)
                
                return (
                  <div key={vault.chainId} className="card" style={{ background: 'var(--panel)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ChainBadge chainId={vault.chainId} showName={true} size="lg" />
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '4px' }}>
                            {parseFloat(vault.balance).toLocaleString()} USDT
                          </div>
                          <div className="sub" style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                            {vault.address.slice(0, 10)}...{vault.address.slice(-8)}
                          </div>
                        </div>
                      </div>
                      
                      <div 
                        className="pill"
                        style={{ 
                          background: `${statusConfig.color}22`,
                          borderColor: statusConfig.color,
                          color: statusConfig.color,
                        }}
                      >
                        {statusConfig.icon} {statusConfig.label}
                      </div>
                    </div>
                    
                    {/* 餘額分布 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                      <div className="card" style={{ padding: '12px', background: 'var(--bg)' }}>
                        <div className="sub" style={{ fontSize: '11px', marginBottom: '4px' }}>總餘額</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'monospace' }}>
                          {parseFloat(vault.balance).toLocaleString()}
                        </div>
                        <div className="sub" style={{ fontSize: '10px' }}>
                          {balancePercentage}% of total
                        </div>
                      </div>
                      
                      <div className="card" style={{ padding: '12px', background: 'var(--success-dim)' }}>
                        <div className="sub" style={{ fontSize: '11px', marginBottom: '4px', color: 'var(--success)' }}>可領款</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--success)' }}>
                          {parseFloat(vault.claimable).toLocaleString()}
                        </div>
                        <div className="sub" style={{ fontSize: '10px', color: 'var(--success)' }}>
                          可立即提領
                        </div>
                      </div>
                      
                      <div className="card" style={{ padding: '12px', background: 'var(--warning-dim)' }}>
                        <div className="sub" style={{ fontSize: '11px', marginBottom: '4px', color: 'var(--warning)' }}>鎖定中</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--warning)' }}>
                          {parseFloat(vault.locked).toLocaleString()}
                        </div>
                        <div className="sub" style={{ fontSize: '10px', color: 'var(--warning)' }}>
                          等待確認
                        </div>
                      </div>
                    </div>
                    
                    {/* 操作按鈕 */}
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={parseFloat(vault.claimable) === 0}
                        style={{ flex: 1 }}
                      >
                        💰 領款
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ flex: 1 }}
                      >
                        📊 查看記錄
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ flex: 1 }}
                      >
                        ⚙️ 設定
                      </button>
                    </div>
                    
                    {/* 最後簽名（如有） */}
                    {vault.lastSignatureHash && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                        <div className="sub" style={{ fontSize: '11px', marginBottom: '4px' }}>
                          最後簽名
                        </div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--muted)' }}>
                          {vault.lastSignatureHash}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {/* 說明 */}
        {!isLoading && (
          <div className="card" style={{ marginTop: '20px', background: 'var(--info-dim)', border: '1px solid var(--info)' }}>
            <div className="row" style={{ gap: '8px', alignItems: 'flex-start' }}>
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--info)' }}>
                  關於 Vault
                </div>
                <div className="sub" style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--info)' }}>
                  • Vault 是部署在各條鏈上的保管合約<br />
                  • 付款人的資產會先存入 Vault，等待條件達成<br />
                  • 達標後收款戶可從 Vault 領款<br />
                  • 逾期未達標則自動退款給付款人
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  )
}
