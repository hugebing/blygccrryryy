/**
 * 數據管理頁面 - /admin/data
 * 管理服務器端的帳單數據
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MerchantLayout from '../../components/layouts/MerchantLayout'
import { getBills, resetBills } from '../../services/mockData'
import type { Bill } from '../../types'

export default function DataManagementPage() {
  const router = useRouter()
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isResetting, setIsResetting] = useState(false)
  
  useEffect(() => {
    loadBills()
  }, [])
  
  const loadBills = async () => {
    setIsLoading(true)
    try {
      const data = await getBills()
      setBills(data)
    } catch (error) {
      console.error('載入帳單失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleReset = async () => {
    if (!confirm('確定要重置所有帳單數據嗎？這將刪除所有自建帳單，只保留示範帳單。')) {
      return
    }
    
    setIsResetting(true)
    try {
      await resetBills()
      // resetBills 會自動刷新頁面
    } catch (error) {
      console.error('重置失敗:', error)
      setIsResetting(false)
    }
  }
  
  const getDataFileLocation = () => {
    return `${process.cwd()}/data/bills.json`
  }
  
  return (
    <MerchantLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 20px 40px' }}>
        {/* 標題 */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>
            📊 數據管理
          </h1>
          <p className="sub">
            管理服務器端的帳單數據
          </p>
        </div>
        
        {/* 數據存儲位置 */}
        <div className="card" style={{ marginBottom: '24px', background: 'var(--blue-dim)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: 'var(--blue)' }}>
            💾 數據存儲位置
          </h3>
          <div style={{ 
            padding: '12px',
            background: 'var(--bg)',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '13px',
            wordBreak: 'break-all'
          }}>
            ./data/bills.json
          </div>
          <p className="sub" style={{ marginTop: '12px', fontSize: '12px' }}>
            💡 提示：這個文件位於項目根目錄的 data 資料夾中
          </p>
        </div>
        
        {/* 數據統計 */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
            📈 數據統計
          </h3>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner"></div>
              <p className="sub" style={{ marginTop: '12px' }}>載入中...</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ 
                padding: '20px',
                background: 'var(--panel)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--gold)' }}>
                  {bills.length}
                </div>
                <div className="sub" style={{ fontSize: '12px', marginTop: '4px' }}>
                  總帳單數
                </div>
              </div>
              
              <div style={{ 
                padding: '20px',
                background: 'var(--panel)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--success)' }}>
                  {bills.filter(b => b.status === 'fulfilled' || b.status === 'claimed').length}
                </div>
                <div className="sub" style={{ fontSize: '12px', marginTop: '4px' }}>
                  已完成
                </div>
              </div>
              
              <div style={{ 
                padding: '20px',
                background: 'var(--panel)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--warning)' }}>
                  {bills.filter(b => b.status === 'pending').length}
                </div>
                <div className="sub" style={{ fontSize: '12px', marginTop: '4px' }}>
                  待付款
                </div>
              </div>
              
              <div style={{ 
                padding: '20px',
                background: 'var(--panel)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--blue)' }}>
                  {bills.filter(b => b.id.startsWith('bill-2025-') && parseInt(b.id.split('-')[2]) > 7).length}
                </div>
                <div className="sub" style={{ fontSize: '12px', marginTop: '4px' }}>
                  自建帳單
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 帳單列表 */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
              📋 所有帳單
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={loadBills}>
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重新載入
            </button>
          </div>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p className="sub">載入中...</p>
            </div>
          ) : bills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p className="sub">沒有帳單</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>銷帳編號</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>描述</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>狀態</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>建立時間</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr 
                      key={bill.id} 
                      style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                      onClick={() => router.push(`/m/bills/${bill.id}`)}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--panel)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600' }}>
                        {bill.id}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {bill.description}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span className={`pill ${
                          bill.status === 'fulfilled' || bill.status === 'claimed' ? 'success' :
                          bill.status === 'pending' ? 'warning' :
                          bill.status === 'partial' ? '' : 'error'
                        }`} style={{ fontSize: '10px' }}>
                          {bill.status === 'fulfilled' ? '已達標' :
                           bill.status === 'claimed' ? '已領款' :
                           bill.status === 'pending' ? '待付款' :
                           bill.status === 'partial' ? '部分付款' : 
                           bill.status === 'expired' ? '已逾期' :
                           bill.status === 'refunded' ? '已退款' :
                           bill.status === 'cancelled' ? '已取消' : bill.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '11px' }} className="sub">
                        {new Date(bill.createdAt).toLocaleString('zh-TW')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* 危險區域 */}
        <div className="card" style={{ background: 'var(--error-dim)', border: '2px solid var(--error)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: 'var(--error)' }}>
            ⚠️ 危險區域
          </h3>
          
          <p className="sub" style={{ marginBottom: '16px', fontSize: '13px' }}>
            以下操作會永久刪除數據，請謹慎操作
          </p>
          
          <button
            className="btn"
            onClick={handleReset}
            disabled={isResetting}
            style={{
              background: 'var(--error)',
              borderColor: 'var(--error)',
              color: 'white'
            }}
          >
            {isResetting ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
                重置中...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', marginRight: '8px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                重置為默認示範帳單
              </>
            )}
          </button>
          
          <p className="sub" style={{ marginTop: '12px', fontSize: '11px', color: 'var(--error)' }}>
            此操作將刪除所有自建帳單，只保留 5 個默認示範帳單
          </p>
        </div>
        
        {/* 說明 */}
        <div className="card" style={{ marginTop: '24px', background: 'var(--panel)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
            📖 如何手動管理數據
          </h3>
          
          <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>1. 查看數據文件：</strong>
            </p>
            <pre style={{ 
              padding: '8px 12px',
              background: 'var(--bg)',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'monospace',
              marginBottom: '12px',
              overflow: 'auto'
            }}>
cat data/bills.json
            </pre>
            
            <p style={{ marginBottom: '8px' }}>
              <strong>2. 手動編輯數據：</strong>
            </p>
            <pre style={{ 
              padding: '8px 12px',
              background: 'var(--bg)',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'monospace',
              marginBottom: '12px',
              overflow: 'auto'
            }}>
vim data/bills.json
# 或使用任何文本編輯器
            </pre>
            
            <p style={{ marginBottom: '8px' }}>
              <strong>3. 刪除數據文件（重置為默認）：</strong>
            </p>
            <pre style={{ 
              padding: '8px 12px',
              background: 'var(--bg)',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'monospace',
              marginBottom: '12px',
              overflow: 'auto'
            }}>
rm data/bills.json
# 系統會在下次訪問時自動重新生成默認數據
            </pre>
            
            <p className="sub" style={{ fontSize: '12px', marginTop: '16px' }}>
              💡 提示：數據文件是 JSON 格式，可以使用任何文本編輯器直接編輯
            </p>
          </div>
        </div>
      </div>
    </MerchantLayout>
  )
}

